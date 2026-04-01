import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { executeSaurusSync, markNeighborhoodSyncResult } from '@/lib/saurus-sync'

export const maxDuration = 300

function verifyCronSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${secret}`
}

/**
 * Sincroniza todos os locais com saurusSyncEnabled = true e integração SAURUS.
 * Protegido por CRON_SECRET (Authorization: Bearer <secret>).
 * Configure em Vercel Cron ou scheduler externo.
 */
export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const locais = await prisma.neighborhood.findMany({
    where: {
      saurusSyncEnabled: true,
      active: true,
    },
    select: { id: true, name: true },
  })

  const results: { id: string; name: string; ok: boolean; message?: string }[] = []

  for (const local of locais) {
    try {
      await executeSaurusSync({
        neighborhoodId: local.id,
        dryRun: false,
      })
      results.push({ id: local.id, name: local.name, ok: true })
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro'
      try {
        await markNeighborhoodSyncResult(local.id, false, message, null)
      } catch {
        // ignore
      }
      results.push({ id: local.id, name: local.name, ok: false, message })
    }
  }

  return NextResponse.json({
    ok: true,
    count: locais.length,
    results,
  })
}
