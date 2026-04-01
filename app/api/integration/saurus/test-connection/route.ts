import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware'
import { testSaurusConnectionForNeighborhood } from '@/lib/saurus-sync'

/**
 * Testa retCadastros + retProdutoEstoque com a configuração do Local (ou fallback .env).
 */
export async function POST(req: NextRequest) {
  const auth = await authMiddleware(req, true)
  if (!auth.authorized) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const body = await req.json().catch(() => ({}))
    const neighborhoodId = body.neighborhoodId as string | undefined
    if (!neighborhoodId) {
      return NextResponse.json({ error: 'neighborhoodId é obrigatório' }, { status: 400 })
    }

    const checks = await testSaurusConnectionForNeighborhood(neighborhoodId)
    const ok = checks.retCadastros.ok && checks.retProdutoEstoque.ok

    return NextResponse.json({ ok, checks }, { status: ok ? 200 : 502 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro no teste'
    return NextResponse.json({ ok: false, message }, { status: 500 })
  }
}
