import { prisma } from '@/lib/prisma'
import { slugifyToCode } from '@/lib/slug'

export async function uniqueNeighborhoodSlug(base: string, excludeId?: string): Promise<string> {
  let candidate = base
  let n = 0
  while (true) {
    const existing = await prisma.neighborhood.findFirst({
      where: {
        slug: candidate,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    })
    if (!existing) return candidate
    n += 1
    candidate = `${base}-${n}`
  }
}

export async function uniqueCategorySlug(base: string, excludeId?: string): Promise<string> {
  let candidate = base
  let n = 0
  while (true) {
    const existing = await prisma.category.findFirst({
      where: {
        slug: candidate,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    })
    if (!existing) return candidate
    n += 1
    candidate = `${base}-${n}`
  }
}

export async function ensureNeighborhoodSlug(row: {
  id: string
  name: string
  slug: string | null
}): Promise<string> {
  if (row.slug?.trim()) return row.slug.trim()
  const base = slugifyToCode(row.name)
  const slug = await uniqueNeighborhoodSlug(base, row.id)
  await prisma.neighborhood.update({
    where: { id: row.id },
    data: { slug },
  })
  return slug
}

export async function ensureCategorySlug(row: {
  id: string
  name: string
  slug: string | null
}): Promise<string> {
  if (row.slug?.trim()) return row.slug.trim()
  const base = slugifyToCode(row.name)
  const slug = await uniqueCategorySlug(base, row.id)
  await prisma.category.update({
    where: { id: row.id },
    data: { slug },
  })
  return slug
}

export async function findNeighborhoodBySlugParam(slugParam: string) {
  const raw = decodeURIComponent(slugParam).trim().toLowerCase()
  if (!raw) return null

  let row = await prisma.neighborhood.findFirst({
    where: { slug: raw, active: true },
    select: { id: true, name: true, photoUrl: true, slug: true, active: true },
  })

  if (!row) {
    const candidates = await prisma.neighborhood.findMany({
      where: { active: true },
      select: { id: true, name: true, photoUrl: true, slug: true, active: true },
    })
    for (const c of candidates) {
      const s = c.slug ?? (await ensureNeighborhoodSlug(c))
      if (s === raw) {
        row = { ...c, slug: s }
        break
      }
    }
  }

  if (!row || !row.active) return null
  const slug = row.slug ?? (await ensureNeighborhoodSlug(row))
  return { id: row.id, name: row.name, photoUrl: row.photoUrl, slug }
}

export async function findCategoryBySlugParam(slugParam: string) {
  const raw = decodeURIComponent(slugParam).trim().toLowerCase()
  if (!raw) return null

  let row = await prisma.category.findFirst({
    where: { slug: raw },
    select: { id: true, name: true, slug: true },
  })

  if (!row) {
    const candidates = await prisma.category.findMany({
      select: { id: true, name: true, slug: true },
    })
    for (const c of candidates) {
      const s = c.slug ?? (await ensureCategorySlug(c))
      if (s === raw) {
        row = { id: c.id, name: c.name, slug: s }
        break
      }
    }
  }

  if (!row) return null
  const slug = row.slug ?? (await ensureCategorySlug(row))
  return { id: row.id, name: row.name, slug }
}
