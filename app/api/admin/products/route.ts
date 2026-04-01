import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware'
import { getLowStockThreshold } from '@/lib/stock-threshold'

export const dynamic = 'force-dynamic'

const noStore = {
  'Cache-Control': 'no-store, max-age=0, must-revalidate',
}

/**
 * Lista produtos para o admin com preço/estoque por local (alerta estoque baixo).
 * Limite de "baixo estoque" vem de settings `lowStockThreshold` (padrão 10).
 */
export async function GET(req: NextRequest) {
  const auth = await authMiddleware(req, true)
  if (!auth.authorized) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const threshold = await getLowStockThreshold()

    const products = await prisma.product.findMany({
      include: {
        category: true,
        productPrices: {
          include: {
            neighborhood: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    const shaped = products.map((p) => {
      const stocksByLocation = p.productPrices.map((pp) => ({
        neighborhoodId: pp.neighborhoodId,
        neighborhoodName: pp.neighborhood.name,
        stock: pp.stock,
      }))
      const minStock =
        stocksByLocation.length === 0
          ? null
          : Math.min(...stocksByLocation.map((s) => s.stock))
      const lowStockLocations = stocksByLocation.filter((s) => s.stock < threshold)
      const hasLowStock = lowStockLocations.length > 0
      const hasZeroStock = stocksByLocation.some((s) => s.stock === 0)

      const { productPrices, ...rest } = p
      return {
        ...rest,
        adminStock: {
          minStock,
          hasLowStock,
          hasZeroStock,
          threshold,
          stocksByLocation,
          lowStockLocations,
        },
      }
    })

    return NextResponse.json({ products: shaped, lowStockThreshold: threshold }, { headers: noStore })
  } catch (error: unknown) {
    console.error('admin products GET', error)
    return NextResponse.json({ error: 'Erro ao listar produtos' }, { status: 500 })
  }
}
