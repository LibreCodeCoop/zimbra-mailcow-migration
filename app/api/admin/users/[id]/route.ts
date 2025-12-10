import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || !(session.user as any).isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = params.id

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Prevent deleting yourself
    if ((session.user as any).email === user.email) {
      return NextResponse.json(
        { error: 'Você não pode remover sua própria conta' },
        { status: 400 }
      )
    }

    // Delete user
    await prisma.user.delete({
      where: { id: userId },
    })

    return NextResponse.json({
      message: 'Usuário removido com sucesso',
    })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Falha ao remover usuário' },
      { status: 500 }
    )
  }
}
