import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware'
import { z } from 'zod'

const updateCategorySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').optional(),
  description: z.string().optional(),
})

interface RouteParams {
  params: {
    id: string
  }
}

// PUT - Atualizar categoria (admin)
export async function PUT(req: NextRequest, { params }: RouteParams) {
  const auth = await authMiddleware(req, true)

  if (!auth.authorized) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const data = updateCategorySchema.parse(body)

    const category = await prisma.category.update({
      where: { id: params.id },
      data,
    })

    return NextResponse.json({ category })
  } catch (error) {
    console.error('Update category error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    if ((error as any).code === 'P2025') {
      return NextResponse.json(
        { error: 'Categoria não encontrada' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: 'Erro ao atualizar categoria' },
      { status: 500 }
    )
  }
}

// DELETE - Deletar categoria (admin)
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const auth = await authMiddleware(req, true)

  if (!auth.authorized) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    // Verificar se a categoria tem produtos
    const category = await prisma.category.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    })

    if (!category) {
      return NextResponse.json(
        { error: 'Categoria não encontrada' },
        { status: 404 }
      )
    }

    if (category._count.products > 0) {
      return NextResponse.json(
        { error: `Não é possível deletar categoria com ${category._count.products} produto(s). Remova os produtos primeiro.` },
        { status: 400 }
      )
    }

    await prisma.category.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Categoria deletada com sucesso' })
  } catch (error) {
    console.error('Delete category error:', error)
    return NextResponse.json(
      { error: 'Erro ao deletar categoria' },
      { status: 500 }
    )
  }
}
