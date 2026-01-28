import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware'

export async function GET(req: NextRequest) {
  const auth = await authMiddleware(req)
  if (!auth.authorized) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const favorites = await prisma.favorite.findMany({
      where: { userId: auth.userId },
      include: {
        product: {
          include: {
            category: true
          }
        }
      }
    })

    return NextResponse.json({ favorites: favorites.map(f => f.product) })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar favoritos' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await authMiddleware(req)
  if (!auth.authorized) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const { productId } = await req.json()

    const existing = await prisma.favorite.findUnique({
      where: {
        userId_productId: {
          userId: auth.userId!,
          productId
        }
      }
    })

    if (existing) {
      await prisma.favorite.delete({
        where: { id: existing.id }
      })
      return NextResponse.json({ favorited: false })
    }

    await prisma.favorite.create({
      data: {
        userId: auth.userId!,
        productId
      }
    })

    return NextResponse.json({ favorited: true })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao processar favorito' }, { status: 500 })
  }
}
