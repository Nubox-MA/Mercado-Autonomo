/**
 * Gera slug de URL amigável (minúsculas, hífens, sem acentos).
 * Ex.: "NüBox 3 Barras" → "nubox-3-barras"
 */
export function slugifyToCode(input: string): string {
  const s = String(input ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return s.length > 0 ? s.slice(0, 80) : 'item'
}

export function catalogStorePath(storeSlug: string): string {
  return `/loja/${encodeURIComponent(storeSlug)}`
}

export function catalogCategoryPath(storeSlug: string, categorySlug: string): string {
  return `/loja/${encodeURIComponent(storeSlug)}/${encodeURIComponent(categorySlug)}`
}

export function catalogStoreUrl(origin: string, storeSlug: string): string {
  const base = origin.replace(/\/$/, '')
  return `${base}${catalogStorePath(storeSlug)}`
}

export function catalogCategoryUrl(
  origin: string,
  storeSlug: string,
  categorySlug: string
): string {
  const base = origin.replace(/\/$/, '')
  return `${base}${catalogCategoryPath(storeSlug, categorySlug)}`
}
