/** Código de barras normalizado (só dígitos, mín. 8 — ignora códigos internos curtos). */
export function normalizeBarcode(raw: string | undefined | null): string | null {
  const digits = String(raw ?? '').replace(/\D/g, '')
  if (digits.length < 8) return null
  return digits
}

const SAURUS_BARCODE_KEYS = [
  'pro_codBarras',
  'pro_codigoBarras',
  'pro_codBarrasEAN',
  'pro_vCodigoBarras',
  'pro_codEAN',
  'pro_codigo',
  'pro_vCodigo',
] as const

/** Lê código de barras de uma linha tbProdutoDados (retCadastros). */
export function extractBarcodeFromSaurusProdutoRow(
  row: Record<string, unknown>
): string | null {
  for (const key of SAURUS_BARCODE_KEYS) {
    const norm = normalizeBarcode(String(row[key] ?? ''))
    if (norm) return norm
  }
  for (const [key, value] of Object.entries(row)) {
    if (!/barras|ean|codbar/i.test(key)) continue
    const norm = normalizeBarcode(String(value ?? ''))
    if (norm) return norm
  }
  return null
}

/** Compara pro_idProduto (numérico quando possível). */
export function compareSaurusProductId(
  a: string | null | undefined,
  b: string | null | undefined
): number {
  const sa = String(a ?? '').trim()
  const sb = String(b ?? '').trim()
  const na = Number(sa)
  const nb = Number(sb)
  if (Number.isFinite(na) && Number.isFinite(nb) && sa !== '' && sb !== '') {
    return na - nb
  }
  return sa.localeCompare(sb, undefined, { numeric: true })
}

type BarcodeDedupeItem = {
  barcode?: string | null
  externalId?: string | null
  externalSystem?: string | null
}

function shouldReplaceBarcodeWinner(
  current: BarcodeDedupeItem,
  candidate: BarcodeDedupeItem
): boolean {
  const curId =
    current.externalSystem === 'SAURUS' ? current.externalId : null
  const candId =
    candidate.externalSystem === 'SAURUS' ? candidate.externalId : null
  if (candId && curId) return compareSaurusProductId(candId, curId) > 0
  if (candId && !curId) return true
  return false
}

/**
 * Mesmo código de barras → mantém um item (maior pro_idProduto Saurus).
 * Sem barras válido → todos permanecem.
 */
export function dedupeCatalogProductsByBarcode<T extends BarcodeDedupeItem>(
  products: T[]
): T[] {
  const winners = new Map<string, T>()
  const withoutBarcode: T[] = []

  for (const product of products) {
    const bc = normalizeBarcode(product.barcode)
    if (!bc) {
      withoutBarcode.push(product)
      continue
    }
    const prev = winners.get(bc)
    if (!prev || shouldReplaceBarcodeWinner(prev, product)) {
      winners.set(bc, product)
    }
  }

  return [...withoutBarcode, ...Array.from(winners.values())]
}
