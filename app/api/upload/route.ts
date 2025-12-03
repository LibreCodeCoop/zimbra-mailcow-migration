import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { processMigration } from '@/lib/migration-worker'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const emailAddress = formData.get('emailAddress') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!emailAddress || !emailAddress.includes('@')) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    const domain = emailAddress.split('@')[1]

    // Create upload directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), process.env.UPLOAD_DIR || 'uploads')
    await mkdir(uploadDir, { recursive: true })

    // Save file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const fileName = `${Date.now()}-${file.name}`
    const filePath = path.join(uploadDir, fileName)
    await writeFile(filePath, buffer)

    // Create migration job
    const job = await prisma.migrationJob.create({
      data: {
        userId: (session.user as any).id,
        emailAddress,
        domain,
        fileName: file.name,
        filePath,
        status: 'pending',
      },
    })

    // Start processing asynchronously
    processMigration(job.id).catch((error) => {
      console.error('Migration error:', error)
    })

    return NextResponse.json({ jobId: job.id, message: 'Upload successful' })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to process upload' },
      { status: 500 }
    )
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
}
