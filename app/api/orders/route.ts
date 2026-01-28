import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware'

export async function GET(req: NextRequest) {
  const auth = await authMiddleware(req)
  if (!auth.authorized) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const orders = await prisma.order.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ orders: orders.map(order => ({
      ...order,
      items: JSON.parse(order.items)
    })) })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar pedidos' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await authMiddleware(req)
  if (!auth.authorized) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const { items, total, observations, paymentMethod } = await req.json()

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Lista vazia' }, { status: 400 })
    }

    const order = await prisma.order.create({
      data: {
        userId: auth.userId!,
        total,
        observations,
        items: JSON.stringify(items),
        paymentMethod, // Salva o método de pagamento
        status: 'PENDING'
      }
    })

    return NextResponse.json({ order: { ...order, items: JSON.parse(order.items) } }, { status: 201 })
  } catch (error: any) {
    console.error('Create order error:', error)
    return NextResponse.json({ 
      error: 'Erro ao salvar pedido', 
      details: error.message,
      code: error.code 
    }, { status: 500 })
  }
}
