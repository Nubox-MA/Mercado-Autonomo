import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { getLowStockThreshold } from '@/lib/stock-threshold'

export async function GET(req: NextRequest) {
  const auth = await authMiddleware(req, true)

  if (!auth.authorized) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || 'all' // all, today, 7days, 30days

    // Total de produtos
    const totalProducts = await prisma.product.count()

    // Produtos disponíveis (ativos)
    const availableProducts = await prisma.product.count({
      where: { active: true },
    })

    // Produtos indisponíveis (inativos)
    const unavailableProducts = await prisma.product.count({
      where: { active: false },
    })

    // Produtos mais visualizados
    let mostViewedProducts

    if (period === 'all') {
      mostViewedProducts = await prisma.product.findMany({
        where: { active: true },
        orderBy: { views: 'desc' },
        take: 10,
        include: {
          category: true,
        },
      })
    } else {
      const startDate = new Date()
      if (period === 'today') {
        startDate.setHours(0, 0, 0, 0)
      } else if (period === '7days') {
        startDate.setDate(startDate.getDate() - 7)
      } else if (period === '30days') {
        startDate.setDate(startDate.getDate() - 30)
      }

      const topViews = await prisma.productView.groupBy({
        by: ['productId'],
        where: {
          viewedAt: { gte: startDate },
        },
        _count: {
          productId: true,
        },
        orderBy: {
          _count: {
            productId: 'desc',
          },
        },
        take: 10,
      })

      const productIds = topViews.map((v) => v.productId)

      const products = await prisma.product.findMany({
        where: {
          id: { in: productIds },
          active: true,
        },
        include: {
          category: true,
        },
      })

      // Mapear as contagens reais do período para os produtos
      mostViewedProducts = products
        .map((p) => ({
          ...p,
          views: topViews.find((v) => v.productId === p.id)?._count.productId || 0,
        }))
        .sort((a, b) => b.views - a.views)
    }

    // Total de categorias
    const totalCategories = await prisma.category.count()

    const lowStockThreshold = await getLowStockThreshold()
    const productsForStock = await prisma.product.findMany({
      select: {
        id: true,
        productPrices: { select: { stock: true } },
      },
    })
    let lowStockProductsCount = 0
    for (const p of productsForStock) {
      const locs = p.productPrices
      if (locs.length === 0) continue
      const anyLow = locs.some((pp) => pp.stock < lowStockThreshold)
      if (anyLow) lowStockProductsCount++
    }

    return NextResponse.json({
      stats: {
        totalProducts,
        availableProducts,
        unavailableProducts,
        lowStockProductsCount,
        lowStockThreshold,
        totalCategories,
        mostViewedProducts: mostViewedProducts.map((p) => ({
          id: p.id,
          name: p.name,
          views: p.views || (period === 'all' ? p.views : 0),
        })),
      },
    })
  } catch (error) {
    console.error('Get stats error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar estatísticas' },
      { status: 500 }
    )
  }
}

