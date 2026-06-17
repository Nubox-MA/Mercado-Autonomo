import { prisma } from '@/lib/prisma'

export type SubscriptionPhase = 'trial' | 'paid' | 'grace' | 'blocked' | 'suspended'

export type BillingStatus = 'ativo' | 'suspenso'

export type SubscriptionRecord = {
  tenant_id: string
  status: BillingStatus
  pago_ate: string | null
  valor_mensal: number
  tolerancia_dias: number
  observacao?: string
  message?: string
  updated_at?: string
}

export type SubscriptionStatusResponse = {
  active: boolean
  phase: SubscriptionPhase
  pago_ate: string | null
  message: string
  plano: {
    pago_ate: string | null
    valor_mensal: number
  }
}

const SETTINGS_KEY = 'billing.subscription'

function envTenantId(): string {
  return (process.env.SUBSCRIPTION_TENANT_ID || 'nubox-catalogo').trim().toLowerCase()
}

function envValorMensal(): number {
  const n = Number(process.env.SUBSCRIPTION_VALOR_MENSAL ?? '349')
  return Number.isFinite(n) && n > 0 ? n : 349
}

function envToleranciaDias(): number {
  const n = parseInt(process.env.SUBSCRIPTION_TOLERANCIA_DIAS ?? '5', 10)
  return Number.isFinite(n) && n >= 0 ? n : 5
}

function envInitialPagoAte(): string | null {
  const v = (process.env.SUBSCRIPTION_PAGO_ATE ?? '').trim()
  return /^\d{4}-\d{2}$/.test(v) ? v : null
}

function defaultRecord(): SubscriptionRecord {
  return {
    tenant_id: envTenantId(),
    status: 'ativo',
    pago_ate: envInitialPagoAte(),
    valor_mensal: envValorMensal(),
    tolerancia_dias: envToleranciaDias(),
    message: envInitialPagoAte() ? 'Assinatura ativa' : 'Período de teste',
  }
}

function parseRecord(raw: string | null | undefined): SubscriptionRecord {
  if (!raw) return defaultRecord()
  try {
    const data = JSON.parse(raw) as Partial<SubscriptionRecord>
    return {
      tenant_id: (data.tenant_id || envTenantId()).trim().toLowerCase(),
      status: data.status === 'suspenso' ? 'suspenso' : 'ativo',
      pago_ate:
        typeof data.pago_ate === 'string' && /^\d{4}-\d{2}$/.test(data.pago_ate)
          ? data.pago_ate
          : null,
      valor_mensal:
        typeof data.valor_mensal === 'number' && data.valor_mensal > 0
          ? data.valor_mensal
          : envValorMensal(),
      tolerancia_dias:
        typeof data.tolerancia_dias === 'number' && data.tolerancia_dias >= 0
          ? data.tolerancia_dias
          : envToleranciaDias(),
      observacao: data.observacao,
      message: data.message,
      updated_at: data.updated_at,
    }
  } catch {
    return defaultRecord()
  }
}

export async function getSubscriptionRecord(): Promise<SubscriptionRecord> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: SETTINGS_KEY } })
    return parseRecord(row?.value)
  } catch {
    return defaultRecord()
  }
}

export async function saveSubscriptionRecord(record: SubscriptionRecord): Promise<void> {
  const payload: SubscriptionRecord = {
    ...record,
    tenant_id: record.tenant_id.trim().toLowerCase(),
    updated_at: new Date().toISOString(),
  }
  await prisma.setting.upsert({
    where: { key: SETTINGS_KEY },
    update: { value: JSON.stringify(payload) },
    create: { key: SETTINGS_KEY, value: JSON.stringify(payload) },
  })
}

function endOfPaidMonth(ym: string): Date {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m, 0, 23, 59, 59, 999)
}

function daysSince(date: Date): number {
  const ms = Date.now() - date.getTime()
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)))
}

export function buildSubscriptionStatus(record: SubscriptionRecord): SubscriptionStatusResponse {
  const plano = {
    pago_ate: record.pago_ate,
    valor_mensal: record.valor_mensal,
  }

  if (record.status === 'suspenso') {
    return {
      active: false,
      phase: 'suspended',
      pago_ate: record.pago_ate,
      message: record.message || record.observacao || 'Assinatura suspensa',
      plano,
    }
  }

  if (!record.pago_ate) {
    return {
      active: true,
      phase: 'trial',
      pago_ate: null,
      message: record.message || 'Período de teste',
      plano,
    }
  }

  const overdueDays = daysSince(endOfPaidMonth(record.pago_ate))

  if (overdueDays === 0) {
    return {
      active: true,
      phase: 'paid',
      pago_ate: record.pago_ate,
      message: record.message || 'Assinatura em dia',
      plano,
    }
  }

  if (overdueDays <= record.tolerancia_dias) {
    return {
      active: true,
      phase: 'grace',
      pago_ate: record.pago_ate,
      message:
        record.message ||
        `Carência: ${record.tolerancia_dias - overdueDays} dia(s) restante(s)`,
      plano,
    }
  }

  return {
    active: false,
    phase: 'blocked',
    pago_ate: record.pago_ate,
    message: record.message || record.observacao || 'Mensalidade em atraso',
    plano,
  }
}

export async function getSubscriptionStatus(): Promise<SubscriptionStatusResponse> {
  const record = await getSubscriptionRecord()
  return buildSubscriptionStatus(record)
}

export function verifyWebhookSecret(header: string | null): boolean {
  const expected = (process.env.SUBSCRIPTION_WEBHOOK_SECRET ?? '').trim()
  if (!expected) return false
  return header?.trim() === expected
}

export function verifyTenantId(tenantId: string): boolean {
  const expected = envTenantId()
  return tenantId.trim().toLowerCase() === expected
}

export type WebhookPayload = {
  tenant_id: string
  pago_ate?: string
  status?: string
  observacao?: string
}

export async function applySubscriptionWebhook(
  body: WebhookPayload
): Promise<SubscriptionStatusResponse> {
  const tenant_id = String(body.tenant_id ?? '').trim().toLowerCase()
  if (!tenant_id || !verifyTenantId(tenant_id)) {
    throw new Error('tenant_id inválido')
  }

  const current = await getSubscriptionRecord()
  const next: SubscriptionRecord = { ...current, tenant_id }

  if (body.observacao) {
    next.observacao = String(body.observacao).trim()
    next.message = next.observacao
  }

  if (body.pago_ate && /^\d{4}-\d{2}$/.test(String(body.pago_ate).trim())) {
    next.pago_ate = String(body.pago_ate).trim()
  }

  const status = String(body.status ?? '').trim().toLowerCase()
  if (status === 'suspenso') {
    next.status = 'suspenso'
    next.message = next.observacao || 'Assinatura suspensa'
  } else if (status === 'ativo') {
    next.status = 'ativo'
    if (!next.message || next.message === 'Assinatura suspensa') {
      next.message = next.observacao || 'Pagamento confirmado'
    }
  }

  await saveSubscriptionRecord(next)
  return buildSubscriptionStatus(next)
}

export function isApiPathExemptFromBilling(pathname: string): boolean {
  const exempt = [
    '/api/health',
    '/api/subscription/status',
    '/api/subscription/webhook',
    '/api/login',
    '/api/auth/login',
  ]
  return exempt.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export function shouldBlockApiAccess(status: SubscriptionStatusResponse): boolean {
  return !status.active && (status.phase === 'blocked' || status.phase === 'suspended')
}
