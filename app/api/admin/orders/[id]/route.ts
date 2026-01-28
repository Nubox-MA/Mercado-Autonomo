import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authMiddleware(req)
  if (!auth.authorized || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { id } = params

  try {
    const order = await prisma.order.findUnique({
      where: { id }
    })

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    }

    await prisma.order.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Pedido excluído com sucesso' })
  } catch (error) {
    console.error('Error deleting order:', error)
    return NextResponse.json({ error: 'Erro ao excluir pedido' }, { status: 500 })
  }
}
