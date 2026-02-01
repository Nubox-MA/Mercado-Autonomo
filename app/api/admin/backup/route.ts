import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

// GET - Fazer backup (exportar dados)
export async function GET(req: NextRequest) {
  const auth = await authMiddleware(req, true)

  if (!auth.authorized || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    // Buscar todos os dados do banco
    const [
      users,
      categories,
      products,
      neighborhoods,
      productPrices,
      orders,
      favorites,
      settings,
    ] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          cpf: true,
          phone: true,
          role: true,
          password: true,
          address: true,
          photoUrl: true,
          neighborhoodId: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.category.findMany(),
      prisma.product.findMany(),
      prisma.neighborhood.findMany(),
      prisma.productPrice.findMany(),
      prisma.order.findMany(),
      prisma.favorite.findMany(),
      prisma.setting.findMany(),
    ])

    const backup = {
      version: '1.0',
      createdAt: new Date().toISOString(),
      data: {
        users,
        categories,
        products,
        neighborhoods,
        productPrices,
        orders,
        favorites,
        settings,
      },
      metadata: {
        usersCount: users.length,
        categoriesCount: categories.length,
        productsCount: products.length,
        neighborhoodsCount: neighborhoods.length,
        ordersCount: orders.length,
      },
    }

    return NextResponse.json(backup, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="backup-${new Date().toISOString().split('T')[0]}.json"`,
      },
    })
  } catch (error: any) {
    console.error('Backup error:', error)
    return NextResponse.json(
      { error: 'Erro ao fazer backup', details: error.message },
      { status: 500 }
    )
  }
}

// POST - Restaurar backup (importar dados)
export async function POST(req: NextRequest) {
  const auth = await authMiddleware(req, true)

  if (!auth.authorized || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { backup, clearExisting = false } = body

    if (!backup || !backup.data) {
      return NextResponse.json(
        { error: 'Formato de backup inválido' },
        { status: 400 }
      )
    }

    // Se clearExisting, limpar dados existentes (exceto usuário admin atual)
    if (clearExisting) {
      const currentUserId = auth.userId

      // Deletar em ordem para respeitar foreign keys
      await prisma.favorite.deleteMany()
      await prisma.productPrice.deleteMany()
      await prisma.order.deleteMany()
      await prisma.productView.deleteMany()
      await prisma.product.deleteMany()
      await prisma.category.deleteMany()
      await prisma.neighborhood.deleteMany()
      await prisma.setting.deleteMany()
      
      // Deletar usuários exceto o admin atual
      if (currentUserId) {
        await prisma.user.deleteMany({
          where: {
            id: { not: currentUserId },
          },
        })
      } else {
        await prisma.user.deleteMany()
      }
    }

    // Restaurar dados
    const { data } = backup

    // Restaurar em ordem para respeitar foreign keys
    if (data.neighborhoods && data.neighborhoods.length > 0) {
      await prisma.neighborhood.createMany({
        data: data.neighborhoods,
        skipDuplicates: true,
      })
    }

    if (data.categories && data.categories.length > 0) {
      await prisma.category.createMany({
        data: data.categories,
        skipDuplicates: true,
      })
    }

    if (data.users && data.users.length > 0) {
      // Não restaurar o usuário atual se estiver no backup
      const currentUserId = auth.userId
      const usersToRestore = currentUserId
        ? data.users.filter((u: any) => u.id !== currentUserId)
        : data.users

      if (usersToRestore.length > 0) {
        await prisma.user.createMany({
          data: usersToRestore,
          skipDuplicates: true,
        })
      }
    }

    if (data.products && data.products.length > 0) {
      await prisma.product.createMany({
        data: data.products,
        skipDuplicates: true,
      })
    }

    if (data.productPrices && data.productPrices.length > 0) {
      await prisma.productPrice.createMany({
        data: data.productPrices,
        skipDuplicates: true,
      })
    }

    if (data.orders && data.orders.length > 0) {
      await prisma.order.createMany({
        data: data.orders,
        skipDuplicates: true,
      })
    }

    if (data.favorites && data.favorites.length > 0) {
      await prisma.favorite.createMany({
        data: data.favorites,
        skipDuplicates: true,
      })
    }

    if (data.settings && data.settings.length > 0) {
      await prisma.setting.createMany({
        data: data.settings,
        skipDuplicates: true,
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Backup restaurado com sucesso!',
      restored: {
        users: data.users?.length || 0,
        categories: data.categories?.length || 0,
        products: data.products?.length || 0,
        neighborhoods: data.neighborhoods?.length || 0,
        orders: data.orders?.length || 0,
      },
    })
  } catch (error: any) {
    console.error('Restore error:', error)
    return NextResponse.json(
      { error: 'Erro ao restaurar backup', details: error.message },
      { status: 500 }
    )
  }
}
