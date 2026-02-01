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
    // Buscar apenas dados essenciais do sistema (não incluir usuários clientes, pedidos ou favoritos)
    const [
      admins,
      categories,
      products,
      neighborhoods,
      productPrices,
      settings,
    ] = await Promise.all([
      // Apenas administradores (dados de acesso)
      prisma.user.findMany({
        where: {
          role: 'ADMIN',
        },
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
      prisma.setting.findMany(),
    ])

    const backup = {
      version: '1.0',
      createdAt: new Date().toISOString(),
      data: {
        admins,
        categories,
        products,
        neighborhoods,
        productPrices,
        settings,
      },
      metadata: {
        adminsCount: admins.length,
        categoriesCount: categories.length,
        productsCount: products.length,
        neighborhoodsCount: neighborhoods.length,
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
      await prisma.productPrice.deleteMany()
      await prisma.productView.deleteMany()
      await prisma.product.deleteMany()
      await prisma.category.deleteMany()
      await prisma.neighborhood.deleteMany()
      await prisma.setting.deleteMany()
      
      // Deletar apenas admins exceto o admin atual (não deletar usuários clientes)
      if (currentUserId) {
        await prisma.user.deleteMany({
          where: {
            role: 'ADMIN',
            id: { not: currentUserId },
          },
        })
      } else {
        await prisma.user.deleteMany({
          where: {
            role: 'ADMIN',
          },
        })
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

    // Restaurar apenas admins (dados de acesso)
    if (data.admins && data.admins.length > 0) {
      // Não restaurar o usuário atual se estiver no backup
      const currentUserId = auth.userId
      const adminsToRestore = currentUserId
        ? data.admins.filter((u: any) => u.id !== currentUserId)
        : data.admins

      if (adminsToRestore.length > 0) {
        await prisma.user.createMany({
          data: adminsToRestore,
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
        admins: data.admins?.length || 0,
        categories: data.categories?.length || 0,
        products: data.products?.length || 0,
        neighborhoods: data.neighborhoods?.length || 0,
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
