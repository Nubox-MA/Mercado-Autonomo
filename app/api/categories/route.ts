import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware'
import { z } from 'zod'

const createCategorySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
})

// GET - Listar categorias (público)
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json({ categories })
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

    const category = await prisma.category.create({
      data,
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

