import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware'
import { ensureCategorySlug, uniqueCategorySlug } from '@/lib/ensure-catalog-slugs'
import { isSemCategoriaLabel } from '@/lib/saurus-sync'
import { slugifyToCode } from '@/lib/slug'
import { z } from 'zod'

const createCategorySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
})

/** Categorias com ao menos 1 produto visível no catálogo da loja (ativo, estoque > 0, preço no local). */
async function categoryIdsWithCatalogProducts(
  neighborhoodId: string
): Promise<Set<string>> {
  const rows = await prisma.product.findMany({
    where: {
      active: true,
      categoryId: { not: null },
      productPrices: {
        some: {
          neighborhoodId,
          stock: { gt: 0 },
        },
      },
    },
    select: { categoryId: true },
    distinct: ['categoryId'],
  })
  return new Set(
    rows.map((r) => r.categoryId).filter((id): id is string => Boolean(id))
  )
}

// GET - Listar categorias (público)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const forCatalog = searchParams.get('catalog') === '1'
    const neighborhoodId = searchParams.get('neighborhoodId')?.trim() || null
    const rows = await prisma.category.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    let categories = await Promise.all(
      rows.map(async (c) => ({
        ...c,
        slug: await ensureCategorySlug({ id: c.id, name: c.name, slug: c.slug }),
      }))
    )

    if (forCatalog) {
      categories = categories.filter((c) => !isSemCategoriaLabel(c.name))
      if (neighborhoodId) {
        const withProducts = await categoryIdsWithCatalogProducts(neighborhoodId)
        categories = categories.filter((c) => withProducts.has(c.id))
      }
    }

    return NextResponse.json(
      { categories },
      { headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' } }
    )
  } catch (error) {
    console.error('Get categories error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar categorias' },
      { status: 500 }
    )
  }
}

// POST - Criar categoria (admin)
export async function POST(req: NextRequest) {
  const auth = await authMiddleware(req, true)

  if (!auth.authorized) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const data = createCategorySchema.parse(body)

    const slug = await uniqueCategorySlug(slugifyToCode(data.name))
    const category = await prisma.category.create({
      data: { ...data, slug },
    })

    return NextResponse.json({ category }, { status: 201 })
  } catch (error) {
    console.error('Create category error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Erro ao criar categoria' },
      { status: 500 }
    )
  }
}

