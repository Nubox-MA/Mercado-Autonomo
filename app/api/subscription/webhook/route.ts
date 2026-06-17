import { NextRequest, NextResponse } from 'next/server'
import {
  applySubscriptionWebhook,
  verifyWebhookSecret,
  type WebhookPayload,
} from '@/lib/subscription'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-subscription-secret')
  if (!verifyWebhookSecret(secret)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  let body: WebhookPayload
  try {
    body = (await req.json()) as WebhookPayload
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  if (!body?.tenant_id) {
    return NextResponse.json({ error: 'tenant_id é obrigatório' }, { status: 400 })
  }

  try {
    const status = await applySubscriptionWebhook(body)
    return NextResponse.json({ ok: true, subscription: status })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao processar webhook'
    const status = message.includes('tenant_id') ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
