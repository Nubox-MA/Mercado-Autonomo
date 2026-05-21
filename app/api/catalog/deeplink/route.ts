import { NextRequest, NextResponse } from 'next/server'
import { findCategoryBySlugParam, findNeighborhoodBySlugParam } from '@/lib/ensure-catalog-slugs'

export const dynamic = 'force-dynamic'

const noStore = {
  'Cache-Control': 'no-store, max-age=0, must-revalidate',
}

/**
 * Resolve slugs de loja e categoria para deep link / QR Code.
 * GET /api/catalog/deeplink?loja=nubox-3-barras&categoria=bebidas
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const loja = searchParams.get('loja')?.trim()
    if (!loja) {
      return NextResponse.json({ error: 'Parâmetro loja é obrigatório' }, { status: 400 })
    }

    const neighborhood = await findNeighborhoodBySlugParam(loja)
    if (!neighborhood) {
      return NextResponse.json({ error: 'Loja não encontrada ou inativa' }, { status: 404 })
    }

    const categoriaParam = searchParams.get('categoria')?.trim()
    let category: { id: string; name: string; slug: string } | null = null
    if (categoriaParam) {
      category = await findCategoryBySlugParam(categoriaParam)
      if (!category) {
        return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 })
      }
    }

    return NextResponse.json(
      {
        neighborhood,
        category,
      },
      { headers: noStore }
    )
  } catch (error) {
    console.error('catalog deeplink error:', error)
    return NextResponse.json({ error: 'Erro ao resolver link do catálogo' }, { status: 500 })
  }
}
