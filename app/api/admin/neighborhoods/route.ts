import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  try {
    const neighborhoods = await prisma.neighborhood.findMany({
      orderBy: { name: 'asc' }
    })
    return NextResponse.json(neighborhoods)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar locais' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authMiddleware(request, true)
    if (!auth.authorized) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { name, photoUrl } = body

    if (!name) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    }

    const neighborhood = await prisma.neighborhood.create({
      data: {
        name,
        deliveryFee: 0, // Mantém compatibilidade com schema, mas não é mais usado
        photoUrl: photoUrl || null
      }
    })

    return NextResponse.json(neighborhood)
  } catch (error) {
    console.error('Create neighborhood error:', error)
    return NextResponse.json({ error: 'Erro ao criar local' }, { status: 500 })
  }
}
