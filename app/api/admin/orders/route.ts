import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware'

export async function GET(req: NextRequest) {
  const auth = await authMiddleware(req)
  if (!auth.authorized || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const orders = await prisma.order.findMany({
      include: {
        user: {
          select: {
            name: true,
            phone: true,
            address: true,
            neighborhood: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ 
      orders: orders.map(order => ({
        ...order,
        items: JSON.parse(order.items)
      })) 
    })
  } catch (error) {
    console.error('Error fetching admin orders:', error)
    return NextResponse.json({ error: 'Erro ao buscar pedidos' }, { status: 500 })
  }
}
