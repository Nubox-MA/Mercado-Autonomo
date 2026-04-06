import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware'

type RangeKey = '24h' | '7d'

function getSince(range: RangeKey): Date {
  const now = Date.now()
  const ms = range === '24h' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000
  return new Date(now - ms)
}

export async function GET(request: NextRequest) {
  const auth = await authMiddleware(request, true)
  if (!auth.authorized) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const rawRange = searchParams.get('range')
  const range: RangeKey = rawRange === '24h' || rawRange === '7d' ? rawRange : '24h'
  const since = getSince(range)

  const [logs, neighborhoods] = await Promise.all([
    prisma.neighborhoodSyncLog.findMany({
      where: { finishedAt: { gte: since } },
      include: {
        neighborhood: { select: { id: true, name: true } },
      },
      orderBy: { finishedAt: 'desc' },
      take: 4000,
    }),
    prisma.neighborhood.findMany({
      select: { id: true, name: true, saurusSyncEnabled: true, active: true },
      orderBy: { name: 'asc' },
    }),
  ])

  const byNeighborhood = new Map<
    string,
    { id: string; name: string; total: number; successes: number; failures: number; avgDurationMs: number | null }
  >()

  for (const n of neighborhoods) {
    byNeighborhood.set(n.id, {
      id: n.id,
      name: n.name,
      total: 0,
      successes: 0,
      failures: 0,
      avgDurationMs: null,
    })
  }

  const durationAgg = new Map<string, { sum: number; count: number }>()

  for (const l of logs) {
    const row = byNeighborhood.get(l.neighborhoodId)
    if (!row) continue
    row.total += 1
    if (l.ok) row.successes += 1
    else row.failures += 1
    if (typeof l.durationMs === 'number' && Number.isFinite(l.durationMs)) {
      const agg = durationAgg.get(l.neighborhoodId) ?? { sum: 0, count: 0 }
      agg.sum += l.durationMs
      agg.count += 1
      durationAgg.set(l.neighborhoodId, agg)
    }
  }

  const neighborhoodStats = [...byNeighborhood.values()].map((r) => {
    const agg = durationAgg.get(r.id)
    const avgDurationMs = agg && agg.count > 0 ? Math.round(agg.sum / agg.count) : null
    const successRate = r.total > 0 ? Number(((r.successes / r.total) * 100).toFixed(1)) : null
    return { ...r, avgDurationMs, successRate }
  })

  neighborhoodStats.sort((a, b) => {
    if (a.failures !== b.failures) return b.failures - a.failures
    return a.name.localeCompare(b.name, 'pt-BR')
  })

  const failures = logs.filter((l) => !l.ok)
  const successCount = logs.length - failures.length
  const successRate = logs.length > 0 ? Number(((successCount / logs.length) * 100).toFixed(1)) : 0

  const recentErrors = failures.slice(0, 25).map((l) => ({
    id: l.id,
    neighborhoodId: l.neighborhoodId,
    neighborhoodName: l.neighborhood.name,
    finishedAt: l.finishedAt,
    message: l.message || 'Erro não informado',
    durationMs: l.durationMs,
  }))

  return NextResponse.json({
    range,
    since,
    summary: {
      totalRuns: logs.length,
      successes: successCount,
      failures: failures.length,
      successRate,
    },
    neighborhoodStats,
    recentErrors,
  })
}

/**
 * Limpa histórico de métricas de sync para recomeçar monitoramento do zero.
 * Remove logs agregados e zera campos de "última sync" nos locais.
 */
export async function DELETE(request: NextRequest) {
  const auth = await authMiddleware(request, true)
  if (!auth.authorized) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const [deletedLogs, updatedNeighborhoods] = await prisma.$transaction([
    prisma.neighborhoodSyncLog.deleteMany({}),
    prisma.neighborhood.updateMany({
      data: {
        saurusLastSyncAt: null,
        saurusLastSyncOk: null,
        saurusLastSyncMessage: null,
        saurusLastSyncSummary: null,
      },
    }),
  ])

  return NextResponse.json({
    ok: true,
    deletedLogs: deletedLogs.count,
    updatedNeighborhoods: updatedNeighborhoods.count,
  })
}
