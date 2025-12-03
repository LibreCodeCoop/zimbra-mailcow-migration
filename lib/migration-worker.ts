import { Client } from 'ssh2'
import { createReadStream, createWriteStream } from 'fs'
import { exec } from 'child_process'
import { promisify } from 'util'
import { prisma } from './prisma'
import path from 'path'
import tar from 'tar'

const execAsync = promisify(exec)

interface MailcowConfig {
  host: string
  port: number
  username: string
  privateKey?: string | null
  password?: string | null
  vmailPath: string
}

export async function processMigration(jobId: string) {
  const job = await prisma.migrationJob.findUnique({
    where: { id: jobId },
  })

  if (!job) {
    throw new Error('Job not found')
  }

  try {
    await prisma.migrationJob.update({
      where: { id: jobId },
      data: { status: 'processing', progress: 10 },
    })

    // Get Mailcow config
    const mailcowConfig = await prisma.mailcowConfig.findFirst()
    if (!mailcowConfig) {
      throw new Error('Mailcow configuration not found')
    }

    // Extract TGZ file
    const extractPath = path.join(path.dirname(job.filePath), `extracted_${job.id}`)
    await extractTgzFile(job.filePath, extractPath)

    await prisma.migrationJob.update({
      where: { id: jobId },
      data: { progress: 40 },
    })

    // Transfer files to Mailcow
    await transferToMailcow(
      mailcowConfig,
      extractPath,
      job.domain,
      job.emailAddress.split('@')[0]
    )

    await prisma.migrationJob.update({
      where: { id: jobId },
      data: { progress: 70 },
    })

    // Fix permissions and reindex
    await fixPermissionsAndReindex(
      mailcowConfig,
      job.domain,
      job.emailAddress.split('@')[0],
      job.emailAddress
    )

    await prisma.migrationJob.update({
      where: { id: jobId },
      data: { status: 'completed', progress: 100 },
    })
  } catch (error) {
    await prisma.migrationJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      },
    })
    throw error
  }
}

async function extractTgzFile(tgzPath: string, extractPath: string): Promise<void> {
  await tar.extract({
    file: tgzPath,
    cwd: extractPath,
  })
}

async function transferToMailcow(
  config: MailcowConfig,
  localPath: string,
  domain: string,
  username: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const conn = new Client()

    conn.on('ready', () => {
      const remotePath = `${config.vmailPath}/${domain}/${username}/Maildir/cur/`

      // Create directory if not exists
      conn.exec(`mkdir -p ${remotePath}`, (err) => {
        if (err) {
          conn.end()
          return reject(err)
        }

        // Transfer files using SFTP
        conn.sftp((err, sftp) => {
          if (err) {
            conn.end()
            return reject(err)
          }

          // Use scp or rsync to transfer entire directory
          conn.exec(
            `scp -r ${localPath}/* ${config.username}@${config.host}:${remotePath}`,
            (err, stream) => {
              if (err) {
                conn.end()
                return reject(err)
              }

              stream.on('close', () => {
                conn.end()
                resolve()
              })

              stream.on('data', (data: Buffer) => {
                console.log('STDOUT: ' + data)
              })

              stream.stderr.on('data', (data: Buffer) => {
                console.log('STDERR: ' + data)
              })
            }
          )
        })
      })
    })

    conn.on('error', (err) => {
      reject(err)
    })

    const connectionConfig: any = {
      host: config.host,
      port: config.port,
      username: config.username,
    }

    if (config.privateKey) {
      connectionConfig.privateKey = config.privateKey
    } else if (config.password) {
      connectionConfig.password = config.password
    }

    conn.connect(connectionConfig)
  })
}

async function fixPermissionsAndReindex(
  config: MailcowConfig,
  domain: string,
  username: string,
  emailAddress: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const conn = new Client()

    conn.on('ready', () => {
      const mailPath = `${config.vmailPath}/${domain}/${username}`

      // Fix permissions
      const chownCommand = `chown -R vmail:vmail ${mailPath}`
      const chmodCommand = `chmod -R 700 ${mailPath}`
      const reindexCommand = `doveadm index -u ${emailAddress} "*"`

      conn.exec(
        `${chownCommand} && ${chmodCommand} && ${reindexCommand}`,
        (err, stream) => {
          if (err) {
            conn.end()
            return reject(err)
          }

          stream.on('close', () => {
            conn.end()
            resolve()
          })

          stream.on('data', (data: Buffer) => {
            console.log('STDOUT: ' + data)
          })

          stream.stderr.on('data', (data: Buffer) => {
            console.log('STDERR: ' + data)
          })
        }
      )
    })

    conn.on('error', (err) => {
      reject(err)
    })

    const connectionConfig: any = {
      host: config.host,
      port: config.port,
      username: config.username,
    }

    if (config.privateKey) {
      connectionConfig.privateKey = config.privateKey
    } else if (config.password) {
      connectionConfig.password = config.password
    }

    conn.connect(connectionConfig)
  })
}
