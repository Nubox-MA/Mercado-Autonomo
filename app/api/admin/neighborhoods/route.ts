import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware'
import { ensureNeighborhoodSlug, uniqueNeighborhoodSlug } from '@/lib/ensure-catalog-slugs'
import { slugifyToCode } from '@/lib/slug'

export const dynamic = 'force-dynamic'

const noStore = {
  'Cache-Control': 'no-store, max-age=0, must-revalidate',
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authMiddleware(request, true)
    const isAdmin = auth.authorized

    const where = isAdmin ? {} : { active: true }

    const list = await prisma.neighborhood.findMany({
      where,
      orderBy: { name: 'asc' },
    })
    const ordered = [...list].sort((a, b) => {
      const ao = a.displayOrder
      const bo = b.displayOrder
      if (ao == null && bo == null) return a.name.localeCompare(b.name)
      if (ao == null) return 1
      if (bo == null) return -1
      if (ao !== bo) return ao - bo
      return a.name.localeCompare(b.name)
    })

    if (!isAdmin) {
      const publicList = await Promise.all(
        ordered.map(async (n) => {
          const slug = await ensureNeighborhoodSlug({
            id: n.id,
            name: n.name,
            slug: n.slug,
          })
          return {
            id: n.id,
            name: n.name,
            slug,
            active: n.active,
            photoUrl: n.photoUrl,
            displayOrder: n.displayOrder,
            deliveryFee: n.deliveryFee,
            createdAt: n.createdAt,
            updatedAt: n.updatedAt,
          }
        })
      )
      return NextResponse.json(publicList, { headers: noStore })
    }

    const adminList = await Promise.all(
      ordered.map(async ({ saurusPdvKey, ...rest }) => {
        const slug = await ensureNeighborhoodSlug({
          id: rest.id,
          name: rest.name,
          slug: rest.slug,
        })
        return {
          ...rest,
          slug,
          saurusPdvKeyConfigured: Boolean(saurusPdvKey?.trim()),
        }
      })
    )
    return NextResponse.json(adminList, { headers: noStore })
  } catch (error: unknown) {
    console.error('Error fetching neighborhoods:', error)
    const err = error as { message?: string; code?: string; meta?: unknown }
    return NextResponse.json(
      {
        error: 'Erro ao buscar locais',
        details: process.env.NODE_ENV === 'development' ? err?.message : undefined,
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authMiddleware(request, true)
    if (!auth.authorized) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      slug: slugInput,
      photoUrl,
      externalId,
      externalSystem,
      saurusPdvKey,
      saurusDominio,
      saurusTabPrecoId,
      saurusSyncEnabled,
      displayOrder,
    } = body

    if (!name) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    }

    let parsedDisplayOrder: number | null = null
    if (displayOrder !== null && displayOrder !== undefined && displayOrder !== '') {
      const n = Number.parseInt(String(displayOrder), 10)
      if (!Number.isFinite(n) || n < 0) {
        return NextResponse.json({ error: 'Ordem inválida (use inteiro >= 0)' }, { status: 400 })
      }
      parsedDisplayOrder = n
    }

    const slugBase =
      typeof slugInput === 'string' && slugInput.trim()
        ? slugifyToCode(slugInput.trim())
        : slugifyToCode(name)
    const finalSlug = await uniqueNeighborhoodSlug(slugBase)

    const neighborhood = await prisma.neighborhood.create({
      data: {
        name,
        slug: finalSlug,
        displayOrder: parsedDisplayOrder,
        deliveryFee: 0,
        photoUrl: photoUrl || null,
        externalId: typeof externalId === 'string' && externalId.trim() ? externalId.trim() : null,
        externalSystem:
          typeof externalSystem === 'string' && externalSystem.trim()
            ? externalSystem.trim()
            : null,
        saurusPdvKey:
          typeof saurusPdvKey === 'string' && saurusPdvKey.trim() ? saurusPdvKey.trim() : null,
        saurusDominio:
          typeof saurusDominio === 'string' && saurusDominio.trim() ? saurusDominio.trim() : null,
        saurusTabPrecoId:
          typeof saurusTabPrecoId === 'string' && saurusTabPrecoId.trim()
            ? saurusTabPrecoId.trim()
            : null,
        saurusSyncEnabled: Boolean(saurusSyncEnabled),
      },
    })

    const { saurusPdvKey: key, ...rest } = neighborhood
    return NextResponse.json({
      ...rest,
      saurusPdvKeyConfigured: Boolean(key?.trim()),
    })
  } catch (error) {
    console.error('Create neighborhood error:', error)
    return NextResponse.json({ error: 'Erro ao criar local' }, { status: 500 })
  }
}
