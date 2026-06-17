import { NextRequest, NextResponse } from 'next/server'
import { isApiPathExemptFromBilling } from '@/lib/subscription'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  if (isApiPathExemptFromBilling(pathname)) {
    return NextResponse.next()
  }

  try {
    const statusUrl = new URL('/api/subscription/status', request.url)
    const res = await fetch(statusUrl.toString(), {
      headers: { 'x-billing-check': '1' },
      cache: 'no-store',
    })
    if (!res.ok) return NextResponse.next()

    const status = (await res.json()) as { active?: boolean; phase?: string }

    if (
      status.active === false &&
      (status.phase === 'blocked' || status.phase === 'suspended')
    ) {
      return NextResponse.json(
        {
          error: 'Serviço temporariamente indisponível',
          subscription: status,
        },
        { status: 402 }
      )
    }
  } catch (error) {
    console.warn('billing middleware: falha ao verificar assinatura', error)
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
