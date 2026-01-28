import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

export async function DELETE(req: NextRequest) {
  const auth = await authMiddleware(req, true)

  if (!auth.authorized) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    // Contar produtos antes de deletar
    const count = await prisma.product.count()

    // Deletar todos os produtos (cascade vai deletar productPrices automaticamente)
    await prisma.product.deleteMany({})

    return NextResponse.json({
      message: `${count} produtos deletados com sucesso`,
      deletedCount: count,
    })
  } catch (error: any) {
    console.error('Delete all products error:', error)
    return NextResponse.json(
      { error: 'Erro ao deletar produtos', details: error.message },
      { status: 500 }
    )
  }
}
