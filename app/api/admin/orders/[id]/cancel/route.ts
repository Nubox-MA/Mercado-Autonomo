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
    const order = await prisma.order.findUnique({
      where: { id }
    })

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    }

    if (order.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Pedido já está cancelado' }, { status: 400 })
    }

    // Se o pedido já estava finalizado, precisamos devolver os produtos ao estoque
    if (order.status === 'COMPLETED') {
      const items = JSON.parse(order.items)
      
      await prisma.$transaction(async (tx) => {
        // Devolver estoque
        for (const item of items) {
          await tx.product.update({
            where: { id: item.id },
            data: {
              stock: {
                increment: item.quantity
              }
            }
          })
        }

        // Mudar status
        await tx.order.update({
          where: { id },
          data: { status: 'CANCELLED' }
        })
      })
    } else {
      // Se era apenas PENDING, apenas muda o status
      await prisma.order.update({
        where: { id },
        data: { status: 'CANCELLED' }
      })
    }

    return NextResponse.json({ message: 'Pedido cancelado com sucesso' })
  } catch (error) {
    console.error('Error cancelling order:', error)
    return NextResponse.json({ error: 'Erro ao cancelar pedido' }, { status: 500 })
  }
}
