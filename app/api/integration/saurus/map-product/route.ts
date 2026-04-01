import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware'

/**
 * Mapear um produto do NüBox com o ID único do produto no Saurus (pro_idProduto)
 *
 * Body:
 * {
 *   "productId": "uuid-do-produto-nubox",
 *   "saurusProductId": "123" // pro_idProduto (chave única)
 * }
 */
export async function POST(req: NextRequest) {
  const auth = await authMiddleware(req, true)
  if (!auth.authorized) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { productId, saurusProductId } = body

    if (!productId || !saurusProductId) {
      return NextResponse.json(
        { error: 'productId e saurusProductId são obrigatórios' },
        { status: 400 }
      )
    }

    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
    }

    const existing = await prisma.product.findFirst({
      where: {
        externalId: String(saurusProductId),
        externalSystem: 'SAURUS',
      },
      select: { id: true, name: true },
    })

    if (existing && existing.id !== productId) {
      return NextResponse.json(
        {
          error: 'ID já está mapeado',
          message: `O Saurus pro_idProduto ${saurusProductId} já está mapeado com "${existing.name}"`,
        },
        { status: 400 }
      )
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: { externalId: String(saurusProductId), externalSystem: 'SAURUS' },
      select: { id: true, name: true, externalId: true, externalSystem: true },
    })

    return NextResponse.json({ ok: true, product: updated })
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: 'Erro ao mapear produto', message: error.message },
      { status: 500 }
    )
  }
}

