import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const bulkUpdateSchema = z.object({
  productIds: z.array(z.string()).min(1, 'Selecione pelo menos um produto'),
  categoryId: z.string().nullable(),
})

export async function POST(req: NextRequest) {
  const auth = await authMiddleware(req, true)

  if (!auth.authorized) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { productIds, categoryId } = bulkUpdateSchema.parse(body)

    // Verificar se a categoria existe (se não for null)
    if (categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
      })

      if (!category) {
        return NextResponse.json(
          { error: 'Categoria não encontrada' },
          { status: 404 }
        )
      }
    }

    // Atualizar todos os produtos de uma vez
    const result = await prisma.product.updateMany({
      where: {
        id: { in: productIds },
      },
      data: {
        categoryId: categoryId || null,
      },
    })

    return NextResponse.json({
      message: `${result.count} produto(s) atualizado(s) com sucesso`,
      updatedCount: result.count,
    })
  } catch (error) {
    console.error('Bulk update category error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Erro ao atualizar produtos' },
      { status: 500 }
    )
  }
}
