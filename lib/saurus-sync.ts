import { prisma } from '@/lib/prisma'
import { buildXmlIntegracaoBase, callSaurusSoap, getSaurusConfig, parseXmlLoose } from '@/lib/saurus'

type ProdutoRow = {
  pro_idProduto?: string
  pro_descProduto?: string
  pro_descCategoria?: string
}

type PrecoRow = {
  pro_idProduto?: string
  pro_idTabPreco?: string
  pro_vPreco?: string
}

type ImagemRow = {
  pro_idProduto?: string
  pro_localImagem?: string
  pro_indStatus?: string
  pro_favorito?: string
}

type EstoqueRow = {
  idProduto?: string
  idLoja?: string
  qSaldo?: string
}

function normalizeStoreId(v: string | null | undefined): string {
  return String(v ?? '').trim()
}

function extractDigits(v: string): string {
  const only = v.replace(/\D+/g, '')
  return only
}

function sameStoreId(expected: string | null, actual: string | null | undefined): boolean {
  if (!expected) return true
  const a = normalizeStoreId(expected)
  const b = normalizeStoreId(actual)
  if (!a || !b) return false
  if (a === b) return true
  const ad = extractDigits(a)
  const bd = extractDigits(b)
  if (ad && bd) return ad === bd
  return false
}

function toArray<T>(v: unknown): T[] {
  if (!v) return []
  return Array.isArray(v) ? (v as T[]) : [v as T]
}

/** Texto vazio ou só espaços → "Sem Categoria"; demais: trim + espaços colapsados */
export function normalizeSaurusCategoryLabel(raw: string | undefined | null): string {
  const s = String(raw ?? '')
    .trim()
    .replace(/\s+/g, ' ')
  return s.length > 0 ? s : 'Sem Categoria'
}

/**
 * Evita duplicar categoria só por maiúsculas/minúsculas (ex.: "Bebidas" / "BEBIDAS").
 * Grafias diferentes continuam como categorias diferentes até alguém fundir no admin.
 */
export async function findOrCreateCategoryFromSaurusLabel(
  raw: string | undefined | null
): Promise<{ id: string }> {
  const label = normalizeSaurusCategoryLabel(raw)
  const existing = await prisma.category.findFirst({
    where: { name: { equals: label, mode: 'insensitive' } },
    select: { id: true },
  })
  if (existing) return existing
  return prisma.category.create({
    data: { name: label },
    select: { id: true },
  })
}

export type SaurusSyncProgress = {
  phase: 'cadastros' | 'estoque' | 'gravando'
  /** 0–100 para fases de rede; na gravação: percentual aproximado pelo índice */
  percent: number
  label: string
  current?: number
  total?: number
}

export type SaurusSyncSummary = {
  neighborhood: { id: string; name: string }
  startedAt?: string
  finishedAt?: string
  durationMs?: number
  /** Linhas de produto no XML da Saurus (cadastro) — em geral = SKUs/códigos diferentes */
  produtos: number
  /** Linhas na tabela de preços do retorno */
  precos: number
  /** Linhas de estoque retornadas (pode incluir várias lojas) */
  estoques: number
  /** Quantos cadastros de produto foram efetivamente gravados/atualizados no NüBox nesta sync */
  produtosGravados: number
  /** Linhas ignoradas (sem código ou sem nome) */
  produtosPulados: number
  idLoja: string | null
  tabPrecoId: string | null
  dryRun: boolean
  upserts: {
    createdProducts: number
    updatedProducts: number
    upsertedProductPrices: number
    updatedStocks: number
  }
  warnings: string[]
}

export async function markNeighborhoodSyncResult(
  neighborhoodId: string,
  ok: boolean,
  message: string,
  summary?: SaurusSyncSummary | null
) {
  const now = new Date()
  const summaryJson = summary ? JSON.stringify(summary) : null
  await prisma.$transaction([
    prisma.neighborhood.update({
      where: { id: neighborhoodId },
      data: {
        saurusLastSyncAt: now,
        saurusLastSyncOk: ok,
        saurusLastSyncMessage: message.slice(0, 500),
        saurusLastSyncSummary: summaryJson,
      },
    }),
    prisma.neighborhoodSyncLog.create({
      data: {
        neighborhoodId,
        ok,
        message: message.slice(0, 1000),
        durationMs: summary?.durationMs ?? null,
        startedAt: summary?.startedAt ? new Date(summary.startedAt) : null,
        finishedAt: summary?.finishedAt ? new Date(summary.finishedAt) : now,
        summary: summaryJson,
      },
    }),
  ])
}

/**
 * Sincroniza Saurus → NüBox para um Local (Neighborhood).
 * Em dryRun não grava produtos/preços e não atualiza saurusLastSync*.
 */
export async function executeSaurusSync(opts: {
  neighborhoodId: string
  dryRun: boolean
  tabPrecoId?: string | null
  idLoja?: string | null
  forceImageRefresh?: boolean
  onProgress?: (e: SaurusSyncProgress) => void
}): Promise<
  | { mode: 'dryRun'; summary: SaurusSyncSummary; sample: { produto: ProdutoRow | null; preco: PrecoRow | null; estoque: EstoqueRow | null } }
  | { mode: 'write'; summary: SaurusSyncSummary }
> {
  const emit = opts.onProgress
  const startedAt = new Date()
  const startedAtMs = Date.now()

  const neighborhood = await prisma.neighborhood.findUnique({
    where: { id: opts.neighborhoodId },
  })
  if (!neighborhood) {
    throw new Error('Local não encontrado')
  }

  const config = getSaurusConfig({
    saurusPdvKey: neighborhood.saurusPdvKey,
    saurusDominio: neighborhood.saurusDominio,
  })
  const xmlIntegracao = buildXmlIntegracaoBase(config)

  const tabPrecoId =
    opts.tabPrecoId?.trim() ||
    neighborhood.saurusTabPrecoId?.trim() ||
    null

  const idLoja =
    opts.idLoja?.trim() ||
    (neighborhood.externalId?.trim() &&
    (!neighborhood.externalSystem || neighborhood.externalSystem === 'SAURUS')
      ? neighborhood.externalId.trim()
      : null)

  emit?.({
    phase: 'cadastros',
    percent: 5,
    label: 'Baixando cadastro de produtos (retCadastros)…',
  })

  const cad = await callSaurusSoap({
    service: 'CADASTROS',
    method: 'retCadastros',
    xmlIntegracao,
    config,
  })
  if (!cad.resultXml) {
    throw new Error(
      `Falha ao obter retCadastros: ${cad.rawSoapResponse.slice(0, 400)}`
    )
  }

  emit?.({
    phase: 'cadastros',
    percent: 35,
    label: 'Cadastro recebido, interpretando XML…',
  })

  const cadParsed = parseXmlLoose<Record<string, unknown>>(cad.resultXml)
  const cadRoot =
    (cadParsed?.cadastros as Record<string, unknown> | undefined) ??
    (cadParsed?.xmlIntegracaoRetorno as Record<string, unknown> | undefined) ??
    cadParsed
  const produtosRows: ProdutoRow[] = toArray<ProdutoRow>(
    (cadRoot as { tbProdutoDados?: { row?: unknown } })?.tbProdutoDados?.row
  )
  const precosRows: PrecoRow[] = toArray<PrecoRow>(
    (cadRoot as { tbProdutoPrecos?: { row?: unknown } })?.tbProdutoPrecos?.row
  )
  const imagensRows: ImagemRow[] = toArray<ImagemRow>(
    (cadRoot as { tbProdutoImagens?: { row?: unknown } })?.tbProdutoImagens?.row
  )

  const precosByProduto = new Map<string, PrecoRow[]>()
  for (const r of precosRows) {
    const pid = r.pro_idProduto ? String(r.pro_idProduto) : undefined
    if (!pid) continue
    const arr = precosByProduto.get(pid) ?? []
    arr.push(r)
    precosByProduto.set(pid, arr)
  }

  const imagemByProduto = new Map<string, string>()
  for (const r of imagensRows) {
    const pid = r.pro_idProduto ? String(r.pro_idProduto) : undefined
    const url = String(r.pro_localImagem ?? '').trim()
    if (!pid || !url) continue
    // Ignora imagens inativas se o status for informado.
    if (r.pro_indStatus && String(r.pro_indStatus) !== '0') continue
    const current = imagemByProduto.get(pid)
    if (!current) {
      imagemByProduto.set(pid, url)
      continue
    }
    // Prefere imagem marcada como favorita.
    const isFav = String(r.pro_favorito ?? '') === '1'
    if (isFav) imagemByProduto.set(pid, url)
  }

  emit?.({
    phase: 'estoque',
    percent: 40,
    label: 'Baixando estoque (retProdutoEstoque)…',
  })

  const est = await callSaurusSoap({
    service: 'RETAGUARDA',
    method: 'retProdutoEstoque',
    xmlIntegracao,
    config,
  })
  if (!est.resultXml) {
    throw new Error(
      `Falha ao obter retProdutoEstoque: ${est.rawSoapResponse.slice(0, 400)}`
    )
  }

  emit?.({ phase: 'estoque', percent: 48, label: 'Estoque recebido, cruzando dados…' })

  const estParsed = parseXmlLoose<Record<string, unknown>>(est.resultXml)
  const estRoot =
    (estParsed?.retProdutoEstoque as Record<string, unknown> | undefined) ??
    (estParsed?.xmlIntegracaoRetorno as Record<string, unknown> | undefined) ??
    estParsed
  const estoqueRows: EstoqueRow[] = toArray<EstoqueRow>(
    (estRoot as { EstoqueLoja?: unknown })?.EstoqueLoja ??
      (estRoot as { tbProdutoEstoque?: { row?: unknown } })?.tbProdutoEstoque?.row ??
      (estRoot as { tbProdutoEstoques?: { row?: unknown } })?.tbProdutoEstoques?.row
  )

  const saldoByProduto = new Map<string, number>()
  for (const r of estoqueRows) {
    const pid = r.idProduto ? String(r.idProduto) : undefined
    if (!pid) continue
    if (!sameStoreId(idLoja, r.idLoja)) continue
    const saldo = Number(String(r.qSaldo ?? '0').replace(',', '.'))
    if (Number.isFinite(saldo)) saldoByProduto.set(pid, Math.trunc(saldo))
  }

  const totalLinhas = produtosRows.length
  const summary: SaurusSyncSummary = {
    neighborhood: { id: neighborhood.id, name: neighborhood.name },
    startedAt: startedAt.toISOString(),
    produtos: totalLinhas,
    precos: precosRows.length,
    estoques: estoqueRows.length,
    produtosGravados: 0,
    produtosPulados: 0,
    idLoja,
    tabPrecoId,
    dryRun: opts.dryRun,
    upserts: {
      createdProducts: 0,
      updatedProducts: 0,
      upsertedProductPrices: 0,
      updatedStocks: 0,
    },
    warnings: [],
  }

  if (opts.dryRun) {
    summary.finishedAt = new Date().toISOString()
    summary.durationMs = Math.max(0, Date.now() - startedAtMs)
    emit?.({
      phase: 'gravando',
      percent: 100,
      label: 'Simulação concluída (nada foi gravado).',
      current: totalLinhas,
      total: totalLinhas,
    })
    return {
      mode: 'dryRun',
      summary,
      sample: {
        produto: produtosRows[0] ?? null,
        preco: precosRows[0] ?? null,
        estoque: estoqueRows[0] ?? null,
      },
    }
  }

  emit?.({
    phase: 'gravando',
    percent: 50,
    label: `Gravando produtos no NüBox (0 de ${totalLinhas})…`,
    current: 0,
    total: totalLinhas,
  })

  let idx = 0
  for (const p of produtosRows) {
    idx++
    const saurusId = p.pro_idProduto ? String(p.pro_idProduto) : undefined
    if (!saurusId) {
      summary.produtosPulados++
      reportWriteProgress(emit, idx, totalLinhas)
      continue
    }

    const name = String(p.pro_descProduto ?? '').trim()
    if (!name) {
      summary.produtosPulados++
      summary.warnings.push(`Linha sem nome (pro_idProduto=${saurusId})`)
      reportWriteProgress(emit, idx, totalLinhas)
      continue
    }

    const priceCandidates = precosByProduto.get(saurusId) ?? []
    const chosen =
      (tabPrecoId
        ? priceCandidates.find((r) => String(r.pro_idTabPreco) === tabPrecoId)
        : undefined) ?? priceCandidates[0]

    const price = chosen?.pro_vPreco
      ? Number(String(chosen.pro_vPreco).replace(',', '.'))
      : NaN
    if (!Number.isFinite(price)) {
      summary.warnings.push(`Sem preço válido para pro_idProduto=${saurusId} (${name})`)
    }

    // Chave da integração: pro_idProduto da Saurus (= externalId), NUNCA o nome do produto.
    const existing = await prisma.product.findFirst({
      where: {
        externalId: saurusId,
        externalSystem: 'SAURUS',
      },
      select: { id: true, imageUrl: true },
    })

    // Produto já existe: não alterar nome, categoria nem preço base — só estoque/preço-por-local abaixo.
    const imageFromSaurus = imagemByProduto.get(saurusId) ?? null
    let product: { id: string }
    if (existing) {
      product = { id: existing.id }
      const canUpdateImage =
        Boolean(imageFromSaurus) &&
        (Boolean(opts.forceImageRefresh) || !existing.imageUrl || existing.imageUrl.trim() === '')
      if (canUpdateImage) {
        await prisma.product.update({
          where: { id: existing.id },
          data: { imageUrl: imageFromSaurus },
          select: { id: true },
        })
      }
    } else {
      const category = await findOrCreateCategoryFromSaurusLabel(p.pro_descCategoria)
      product = await prisma.product.create({
        data: {
          name,
          description: null,
          price: Number.isFinite(price) ? price : 0,
          promoPrice: null,
          isPromotion: false,
          isNew: false,
          stock: 0,
          imageUrl: imageFromSaurus,
          categoryId: category.id,
          active: true,
          externalId: saurusId,
          externalSystem: 'SAURUS',
        },
        select: { id: true },
      })
    }

    if (existing) summary.upserts.updatedProducts++
    else summary.upserts.createdProducts++

    const saldo = saldoByProduto.get(saurusId)
    const stock = typeof saldo === 'number' ? saldo : 0

    // Preço por local: na primeira vez vem da Saurus; nas próximas syncs só atualiza ESTOQUE (vendas/reposição).
    await prisma.productPrice.upsert({
      where: {
        productId_neighborhoodId: {
          productId: product.id,
          neighborhoodId: neighborhood.id,
        },
      },
      update: { stock },
      create: {
        productId: product.id,
        neighborhoodId: neighborhood.id,
        price: Number.isFinite(price) ? price : 0,
        promoPrice: null,
        isPromotion: false,
        stock,
      },
    })
    summary.upserts.upsertedProductPrices++
    summary.upserts.updatedStocks++
    summary.produtosGravados++

    reportWriteProgress(emit, idx, totalLinhas)
  }

  summary.finishedAt = new Date().toISOString()
  summary.durationMs = Math.max(0, Date.now() - startedAtMs)
  await markNeighborhoodSyncResult(neighborhood.id, true, 'OK', summary)

  emit?.({
    phase: 'gravando',
    percent: 100,
    label: 'Sincronização concluída.',
    current: totalLinhas,
    total: totalLinhas,
  })

  return { mode: 'write', summary }
}

function reportWriteProgress(
  emit: ((e: SaurusSyncProgress) => void) | undefined,
  index: number,
  total: number
) {
  if (!emit || total <= 0) return
  const frac = index / total
  const percent = Math.min(99, Math.round(50 + frac * 50))
  emit({
    phase: 'gravando',
    percent,
    label: `Gravando produtos… ${index} de ${total}`,
    current: index,
    total,
  })
}

export async function testSaurusConnectionForNeighborhood(neighborhoodId: string) {
  const neighborhood = await prisma.neighborhood.findUnique({
    where: { id: neighborhoodId },
  })
  if (!neighborhood) throw new Error('Local não encontrado')

  const config = getSaurusConfig({
    saurusPdvKey: neighborhood.saurusPdvKey,
    saurusDominio: neighborhood.saurusDominio,
  })
  const xmlIntegracao = buildXmlIntegracaoBase(config)

  const cad = await callSaurusSoap({
    service: 'CADASTROS',
    method: 'retCadastros',
    xmlIntegracao,
    config,
  })
  const est = await callSaurusSoap({
    service: 'RETAGUARDA',
    method: 'retProdutoEstoque',
    xmlIntegracao,
    config,
  })

  return {
    retCadastros: {
      ok: !!cad.resultXml,
      xmlLength: cad.resultXml?.length ?? 0,
      soapPreview: cad.resultXml ? undefined : cad.rawSoapResponse.slice(0, 1500),
    },
    retProdutoEstoque: {
      ok: !!est.resultXml,
      xmlLength: est.resultXml?.length ?? 0,
      soapPreview: est.resultXml ? undefined : est.rawSoapResponse.slice(0, 1500),
    },
  }
}
