import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { buildXmlIntegracaoBase, callSaurusSoap, getSaurusConfig } from '@/lib/saurus'

/**
 * Teste (dry-run) do retCadastros — usa config do Local se neighborhoodId for enviado.
 */
export async function POST(req: NextRequest) {
  const auth = await authMiddleware(req, true)
  if (!auth.authorized) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const body = await req.json().catch(() => ({}))
    const neighborhoodId = body.neighborhoodId as string | undefined

    let overrides: { saurusPdvKey?: string | null; saurusDominio?: string | null } | undefined
    if (neighborhoodId) {
      const n = await prisma.neighborhood.findUnique({ where: { id: neighborhoodId } })
      if (!n) return NextResponse.json({ error: 'Local não encontrado' }, { status: 404 })
      overrides = { saurusPdvKey: n.saurusPdvKey, saurusDominio: n.saurusDominio }
    }

    const config = getSaurusConfig(overrides)
    const { resultXml, rawSoapResponse } = await callSaurusSoap({
      service: 'CADASTROS',
      method: 'retCadastros',
      xmlIntegracao: buildXmlIntegracaoBase(config),
      config,
    })

    if (!resultXml) {
      return NextResponse.json(
        {
          ok: false,
          message:
            'Não foi possível extrair/decodificar o XML de retorno. Verifique token, chave PDV e formato do SOAP.',
          soapPreview: rawSoapResponse.slice(0, 2000),
        },
        { status: 502 }
      )
    }

    const preview = resultXml.slice(0, 3000)
    const hasProdutos =
      resultXml.includes('tbProdutoDados') || resultXml.includes('tbProdutoPrecos')

    return NextResponse.json({
      ok: true,
      method: 'retCadastros',
      neighborhoodId: neighborhoodId ?? null,
      hasProdutos,
      xmlPreview: preview,
      xmlLength: resultXml.length,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro'
    return NextResponse.json(
      { ok: false, error: 'Erro no teste retCadastros', message },
      { status: 500 }
    )
  }
}
