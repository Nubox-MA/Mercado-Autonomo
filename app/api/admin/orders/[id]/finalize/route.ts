import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authMiddleware(req)
  if (!auth.authorized || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { id } = params

  try {
    // 1. Buscar o pedido
    const order = await prisma.order.findUnique({
      where: { id }
    })

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    }

    if (order.status === 'COMPLETED') {
      return NextResponse.json({ error: 'Pedido já está finalizado' }, { status: 400 })
    }

    const items = JSON.parse(order.items)

    // 2. Usar transação para atualizar estoque e status do pedido
    await prisma.$transaction(async (tx) => {
      // Atualizar estoque para cada item
      for (const item of items) {
        await tx.product.update({
          where: { id: item.id },
          data: {
            stock: {
              decrement: item.quantity
            }
          }
        })
      }

      // Marcar pedido como finalizado
      await tx.order.update({
        where: { id },
        data: { status: 'COMPLETED' }
      })
    })

    return NextResponse.json({ message: 'Pedido finalizado e estoque atualizado com sucesso' })
  } catch (error) {
    console.error('Error finalizing order:', error)
    return NextResponse.json({ error: 'Erro ao finalizar pedido' }, { status: 500 })
  }
}
