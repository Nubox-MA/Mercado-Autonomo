import { NextResponse } from 'next/server'
import { getSubscriptionStatus } from '@/lib/subscription'

export const dynamic = 'force-dynamic'

const noStore = {
  'Cache-Control': 'no-store, max-age=0, must-revalidate',
}

/** Sempre acessível — inclusive com assinatura suspensa (Billing Hub). */
export async function GET() {
  try {
    const status = await getSubscriptionStatus()
    return NextResponse.json(status, { headers: noStore })
  } catch (error) {
    console.error('subscription/status error:', error)
    return NextResponse.json(
      {
        active: true,
        phase: 'trial',
        pago_ate: null,
        message: 'Período de teste',
        plano: { pago_ate: null, valor_mensal: 349 },
      },
      { headers: noStore }
    )
  }
}
