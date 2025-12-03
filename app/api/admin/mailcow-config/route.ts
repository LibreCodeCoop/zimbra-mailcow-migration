import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || !(session.user as any).isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const config = await prisma.mailcowConfig.findFirst()

    if (!config) {
      return NextResponse.json({ message: 'No configuration found' }, { status: 404 })
    }

    // Don't return sensitive data
    return NextResponse.json({
      id: config.id,
      host: config.host,
      port: config.port,
      username: config.username,
      vmailPath: config.vmailPath,
      hasPrivateKey: !!config.privateKey,
      hasPassword: !!config.password,
    })
  } catch (error) {
    console.error('Error fetching config:', error)
    return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || !(session.user as any).isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { host, port, username, privateKey, password, vmailPath } = body

    if (!host || !port || !username) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Delete existing config and create new one
    await prisma.mailcowConfig.deleteMany({})

    const config = await prisma.mailcowConfig.create({
      data: {
        host,
        port: parseInt(port),
        username,
        privateKey: privateKey || null,
        password: password || null,
        vmailPath: vmailPath || '/var/vmail',
      },
    })

    return NextResponse.json({
      message: 'Configuration saved successfully',
      id: config.id,
    })
  } catch (error) {
    console.error('Error saving config:', error)
    return NextResponse.json({ error: 'Failed to save config' }, { status: 500 })
  }
}
