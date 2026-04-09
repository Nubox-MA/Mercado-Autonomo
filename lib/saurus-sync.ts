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

/** Tabelas de promoção (retCadastros v4) — doc WsCadastros */
type PromocaoDadosRow = {
  pro_idPromocao?: string
  pro_dInicio?: string
  pro_dFinal?: string
  pro_hInicio?: string
  pro_hFinal?: string
  pro_diasSemana?: string
  pro_indStatus?: string
  pro_vMinimo?: string
}

type PromocaoRegraRow = {
  pro_idPromocaoRegra?: string
  pro_idPromocao?: string
  pro_tpPromocao?: string
  pro_qPromocao?: string
  pro_vPromocao?: string
}

type PromocaoItemRow = {
  pro_idProduto?: string
  pro_idPromocaoRegra?: string
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

function parseNumLoose(v: string | undefined | null): number {
  const n = Number(String(v ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : NaN
}

/** Preço unitário da regra (pro_vPromocao / pro_qPromocao quando quantidade > 1). */
function unitPriceFromPromoRegra(r: PromocaoRegraRow): number | null {
  const v = parseNumLoose(r.pro_vPromocao)
  if (!Number.isFinite(v) || v <= 0) return null
  const q = parseNumLoose(r.pro_qPromocao)
  if (Number.isFinite(q) && q > 1) return v / q
  return v
}

function endOfDayUtc(d: Date): Date {
  const x = new Date(d)
  x.setUTCHours(23, 59, 59, 999)
  return x
}

function isPromoDadosVigente(row: PromocaoDadosRow, now: Date): boolean {
  if (String(row.pro_indStatus ?? '') !== '0') return false
  const d0 = row.pro_dInicio ? new Date(row.pro_dInicio) : null
  const d1 = row.pro_dFinal ? endOfDayUtc(new Date(row.pro_dFinal)) : null
  if (d0 && !Number.isNaN(d0.getTime()) && now < d0) return false
  if (d1 && !Number.isNaN(d1.getTime()) && now > d1) return false
  return true
}

/** Bitmask: domingo=1, segunda=2, … (1 << getDay() com JS: 0=domingo). */
function isDiaSemanaPromocaoOk(diasSemanaRaw: string | undefined, now: Date): boolean {
  const raw = String(diasSemanaRaw ?? '').trim()
  if (!raw || raw === '127') return true
  const n = parseInt(raw, 10)
  if (!Number.isFinite(n) || n <= 0) return true
  const bit = 1 << now.getDay()
  return (n & bit) !== 0
}

/**
 * Cruza tbPromocaoDados + tbPromocaoRegras + tbPromocaoItens e devolve
 * pro_idProduto (Saurus) → preço promocional unitário vigente.
 */
function buildPromotionUnitPriceBySaurusProductId(
  cadRoot: Record<string, unknown>,
  now: Date = new Date()
): Map<string, number> {
  const dadosRows = toArray<PromocaoDadosRow>(
    (cadRoot as { tbPromocaoDados?: { row?: unknown } })?.tbPromocaoDados?.row
  )
  const regrasRows = toArray<PromocaoRegraRow>(
    (cadRoot as { tbPromocaoRegras?: { row?: unknown } })?.tbPromocaoRegras?.row
  )
  const itensRows = toArray<PromocaoItemRow>(
    (cadRoot as { tbPromocaoItens?: { row?: unknown } })?.tbPromocaoItens?.row
  )

  const dadosByPromo = new Map<string, PromocaoDadosRow>()
  for (const d of dadosRows) {
    const id = d.pro_idPromocao ? String(d.pro_idPromocao) : ''
    if (id) dadosByPromo.set(id, d)
  }

  const regraById = new Map<string, PromocaoRegraRow>()
  for (const r of regrasRows) {
    const id = r.pro_idPromocaoRegra ? String(r.pro_idPromocaoRegra) : ''
    if (id) regraById.set(id, r)
  }

  const out = new Map<string, number>()
  for (const it of itensRows) {
    const pid = it.pro_idProduto ? String(it.pro_idProduto) : ''
    const rid = it.pro_idPromocaoRegra ? String(it.pro_idPromocaoRegra) : ''
    if (!pid || !rid) continue
    const regra = regraById.get(rid)
    if (!regra?.pro_idPromocao) continue
    const promo = dadosByPromo.get(String(regra.pro_idPromocao))
    if (!promo || !isPromoDadosVigente(promo, now)) continue
    if (!isDiaSemanaPromocaoOk(promo.pro_diasSemana, now)) continue
    const unit = unitPriceFromPromoRegra(regra)
    if (unit === null || unit <= 0) continue
    if (!out.has(pid)) out.set(pid, unit)
  }
  return out
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
  /** Produtos com preço promocional aplicado (Saurus promoções vigentes) */
  promocoesAplicadas: number
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
  const cadRootRecord = cadRoot as Record<string, unknown>
  const promoUnitBySaurusId = buildPromotionUnitPriceBySaurusProductId(cadRootRecord)
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
    promocoesAplicadas: 0,
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

  // ------------- OTIMIZAÇÃO: gravação em lotes com concorrência limitada -------------
  // Progresso agregado durante os lotes
  let processedCount = 0
  function emitProgress() {
    reportWriteProgress(emit, processedCount, totalLinhas)
  }

  // 1) Pré-carrega produtos existentes por (externalId, 'SAURUS')
  const existingProducts = await prisma.product.findMany({
    where: { externalSystem: 'SAURUS', externalId: { in: produtosRows.map(p => String(p.pro_idProduto ?? '')) } },
    select: { id: true, externalId: true, imageUrl: true },
  })
  const externalIdToExisting = new Map<string, { id: string; imageUrl: string | null }>()
  for (const ex of existingProducts) {
    if (ex.externalId) externalIdToExisting.set(ex.externalId, { id: ex.id, imageUrl: ex.imageUrl })
  }

  // 2) Descobre categorias necessárias antecipadamente (minimiza roundtrips)
  const categoryLabelToId = new Map<string, string>()
  async function getCategoryId(labelRaw: string | undefined | null): Promise<string> {
    const norm = normalizeSaurusCategoryLabel(labelRaw)
    const cached = categoryLabelToId.get(norm)
    if (cached) return cached
    const found = await findOrCreateCategoryFromSaurusLabel(norm)
    categoryLabelToId.set(norm, found.id)
    return found.id
  }

  // 3) Monta dados para novos produtos e updates necessários
  type PreparedProduct = {
    saurusId: string
    name: string
    priceFromSaurus: number
    promoPrice: number | null
    isPromotion: boolean
    imageFromSaurus: string | null
    categoryLabel: string | undefined | null
  }
  const prepared: PreparedProduct[] = []
  for (const p of produtosRows) {
    const saurusId = p.pro_idProduto ? String(p.pro_idProduto) : ''
    if (!saurusId) {
      summary.produtosPulados++
      continue
    }
    const name = String(p.pro_descProduto ?? '').trim()
    if (!name) {
      summary.produtosPulados++
      summary.warnings.push(`Linha sem nome (pro_idProduto=${saurusId})`)
      continue
    }
    const priceCandidates = precosByProduto.get(saurusId) ?? []
    const chosen =
      (tabPrecoId
        ? priceCandidates.find((r) => String(r.pro_idTabPreco) === tabPrecoId)
        : undefined) ?? priceCandidates[0]
    const price = chosen?.pro_vPreco ? Number(String(chosen.pro_vPreco).replace(',', '.')) : NaN
    if (!Number.isFinite(price)) {
      summary.warnings.push(`Sem preço válido para pro_idProduto=${saurusId} (${name})`)
    }
    const base = Number.isFinite(price) ? price : 0
    const promoUnit = promoUnitBySaurusId.get(saurusId)
    let promoPrice: number | null = null
    let isPromotion = false
    if (
      promoUnit !== undefined &&
      Number.isFinite(promoUnit) &&
      promoUnit > 0 &&
      base > 0 &&
      promoUnit < base - 1e-6
    ) {
      promoPrice = promoUnit
      isPromotion = true
    }
    const imageFromSaurus = imagemByProduto.get(saurusId) ?? null
    prepared.push({
      saurusId,
      name,
      priceFromSaurus: base,
      promoPrice,
      isPromotion,
      imageFromSaurus,
      categoryLabel: p.pro_descCategoria,
    })
  }

  summary.promocoesAplicadas = prepared.filter((x) => x.isPromotion).length

  // 4) Cria em lote os que não existem
  const toCreate = prepared.filter(p => !externalIdToExisting.has(p.saurusId))
  if (toCreate.length > 0) {
    const createPayload = []
    for (const p of toCreate) {
      const categoryId = await getCategoryId(p.categoryLabel)
      createPayload.push({
        name: p.name,
        description: null as string | null,
        price: p.priceFromSaurus,
        promoPrice: p.promoPrice,
        isPromotion: p.isPromotion,
        isNew: false,
        stock: 0,
        imageUrl: p.imageFromSaurus,
        categoryId,
        active: true,
        externalId: p.saurusId,
        externalSystem: 'SAURUS' as const,
      })
    }
    // Prisma createMany ignora select/returning; depois buscamos os criados
    await prisma.product.createMany({ data: createPayload, skipDuplicates: true })
    summary.upserts.createdProducts += createPayload.length
    processedCount += createPayload.length
    emitProgress()
    // Recarrega o mapa com os IDs recém-criados
    const updatedExisting = await prisma.product.findMany({
      where: { externalSystem: 'SAURUS', externalId: { in: toCreate.map(p => p.saurusId) } },
      select: { id: true, externalId: true, imageUrl: true },
    })
    for (const ex of updatedExisting) {
      if (ex.externalId) externalIdToExisting.set(ex.externalId, { id: ex.id, imageUrl: ex.imageUrl })
    }
  }

  // 5) Atualiza imagens faltantes em paralelo limitada
  // Helpers: executa operações em lotes pequenos; para múltiplos updates usa uma única conexão ($transaction)
  async function runUpdatesInBatchesTx<T>(
    items: T[],
    batchSize: number,
    builder: (it: T, index: number) => any
  ) {
    for (let i = 0; i < items.length; i += batchSize) {
      const slice = items.slice(i, i + batchSize)
      // Constrói as operações
      const ops = slice.map((it, k) => builder(it, i + k)) as any[]
      // Usa uma única conexão no pool
      await prisma.$transaction(ops as any)
      processedCount += slice.length
      emitProgress()
    }
  }

  const existingPrepared = prepared.filter((p) => externalIdToExisting.has(p.saurusId))
  if (existingPrepared.length > 0) {
    await runUpdatesInBatchesTx(existingPrepared, 8, (p) => {
      const ex = externalIdToExisting.get(p.saurusId)
      if (!ex) return prisma.$executeRaw`SELECT 1`
      const shouldImage =
        !!p.imageFromSaurus &&
        (opts.forceImageRefresh || !ex.imageUrl || ex.imageUrl.trim() === '')
      summary.upserts.updatedProducts++
      return prisma.product.update({
        where: { id: ex.id },
        data: {
          name: p.name,
          price: p.priceFromSaurus,
          promoPrice: p.promoPrice,
          isPromotion: p.isPromotion,
          ...(shouldImage ? { imageUrl: p.imageFromSaurus } : {}),
        },
        select: { id: true } as any,
      })
    })
  }

  // 6) Upsert de preços/estoque por local (createMany para novos; updates individuais em lotes)
  const allProductIds = [...externalIdToExisting.values()].map(v => v.id)
  const existingPrices = await prisma.productPrice.findMany({
    where: { neighborhoodId: neighborhood.id, productId: { in: allProductIds } },
    select: { productId: true },
  })
  const existingPriceSet = new Set(existingPrices.map(p => p.productId))

  const toCreatePrices: { productId: string; neighborhoodId: string; price: number; promoPrice: number | null; isPromotion: boolean; stock: number }[] = []
  const toUpdatePrices: {
    productId: string
    price: number
    promoPrice: number | null
    isPromotion: boolean
    stock: number
  }[] = []

  for (const p of prepared) {
    const ex = externalIdToExisting.get(p.saurusId)
    if (!ex) continue
    const saldo = saldoByProduto.get(p.saurusId)
    const stock = typeof saldo === 'number' ? saldo : 0
    if (!existingPriceSet.has(ex.id)) {
      toCreatePrices.push({
        productId: ex.id,
        neighborhoodId: neighborhood.id,
        price: p.priceFromSaurus,
        promoPrice: p.promoPrice,
        isPromotion: p.isPromotion,
        stock,
      })
    } else {
      toUpdatePrices.push({
        productId: ex.id,
        price: p.priceFromSaurus,
        promoPrice: p.promoPrice,
        isPromotion: p.isPromotion,
        stock,
      })
    }
  }

  if (toCreatePrices.length > 0) {
    await prisma.productPrice.createMany({ data: toCreatePrices, skipDuplicates: true })
    summary.upserts.upsertedProductPrices += toCreatePrices.length
    summary.upserts.updatedStocks += toCreatePrices.length
    summary.produtosGravados += toCreatePrices.length
    processedCount += toCreatePrices.length
    emitProgress()
  }
  if (toUpdatePrices.length > 0) {
    await runUpdatesInBatchesTx(toUpdatePrices, 10, (item) => {
      return prisma.productPrice.update({
        where: {
          productId_neighborhoodId: {
            productId: item.productId,
            neighborhoodId: neighborhood.id,
          },
        },
        data: {
          price: item.price,
          promoPrice: item.promoPrice,
          isPromotion: item.isPromotion,
          stock: item.stock,
        },
      })
    })
    summary.upserts.updatedStocks += toUpdatePrices.length
    summary.produtosGravados += toUpdatePrices.length
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
