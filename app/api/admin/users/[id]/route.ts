import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authMiddleware(req, true)
  
  if (!auth.authorized) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const userId = params.id

    // Verificar se o usuário existe e é morador
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    if (user.role === 'ADMIN') {
      return NextResponse.json(
        { error: 'Não é possível excluir administradores' },
        { status: 400 }
      )
    }

    // Deletar usuário permanentemente
    await prisma.user.delete({
      where: { id: userId },
    })

    return NextResponse.json({ message: 'Morador excluído com sucesso' })
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json(
      { error: 'Erro ao excluir morador' },
      { status: 500 }
    )
  }
}
