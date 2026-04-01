import { NextRequest } from 'next/server'
import { authMiddleware } from '@/lib/middleware'
import {
  executeSaurusSync,
  markNeighborhoodSyncResult,
} from '@/lib/saurus-sync'

export const maxDuration = 300

/**
 * Sync Saurus -> NüBox
 *
 * Query:
 * - neighborhoodId (obrigatório)
 * - tabPrecoId, idLoja (opcionais)
 * - forceImageRefresh=true (opcional) — força sobrescrever imageUrl com tbProdutoImagens
 * - dryRun=true (opcional)
 * - stream=true (opcional) — resposta NDJSON com eventos progress + done (só escrita real; dryRun usa JSON normal)
 */
export async function POST(req: NextRequest) {
  const auth = await authMiddleware(req, true)
  if (!auth.authorized) {
    return new Response(JSON.stringify({ error: 'Não autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { searchParams } = new URL(req.url)
  const neighborhoodId = searchParams.get('neighborhoodId')
  const tabPrecoId = searchParams.get('tabPrecoId')
  const idLoja = searchParams.get('idLoja')
  const forceImageRefresh = searchParams.get('forceImageRefresh') === 'true'
  const dryRun = searchParams.get('dryRun') === 'true'
  const stream = searchParams.get('stream') === 'true'

  if (!neighborhoodId) {
    return new Response(JSON.stringify({ error: 'neighborhoodId é obrigatório' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (stream && dryRun) {
    return new Response(
      JSON.stringify({
        error: 'Use stream=false para simulação; stream é só para sincronização completa.',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  if (stream) {
    const encoder = new TextEncoder()
    const streamOut = new ReadableStream({
      async start(controller) {
        const send = (obj: object) => {
          controller.enqueue(encoder.encode(`${JSON.stringify(obj)}\n`))
        }
        try {
          const result = await executeSaurusSync({
            neighborhoodId,
            dryRun: false,
            tabPrecoId,
            idLoja,
            forceImageRefresh,
            onProgress: (e) => send({ type: 'progress', ...e }),
          })
          if (result.mode === 'write') {
            send({ type: 'done', ok: true, mode: 'write', summary: result.summary })
          }
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Erro ao sincronizar'
          try {
            await markNeighborhoodSyncResult(neighborhoodId, false, message, null)
          } catch {
            // ignore
          }
          send({ type: 'done', ok: false, error: message })
        }
        controller.close()
      },
    })

    return new Response(streamOut, {
      headers: {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    })
  }

  try {
    const result = await executeSaurusSync({
      neighborhoodId,
      dryRun,
      tabPrecoId,
      idLoja,
      forceImageRefresh,
    })

    if (result.mode === 'dryRun') {
      return Response.json({
        ok: true,
        mode: 'dryRun',
        summary: result.summary,
        sample: result.sample,
      })
    }

    return Response.json({ ok: true, mode: 'write', summary: result.summary })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao sincronizar'
    try {
      await markNeighborhoodSyncResult(neighborhoodId, false, message, null)
    } catch {
      // ignore
    }
    return Response.json(
      { ok: false, error: 'Erro ao sincronizar', message },
      { status: 500 }
    )
  }
}
