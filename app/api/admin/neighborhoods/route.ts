import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  try {
    // Tentar buscar com filtro active primeiro
    let neighborhoods
    try {
      neighborhoods = await prisma.neighborhood.findMany({
        where: { active: true },
        orderBy: { name: 'asc' }
      })
    } catch (activeError: any) {
      // Se falhar (coluna active pode não existir), buscar todos
      console.warn('Erro ao buscar com filtro active, tentando sem filtro:', activeError?.message)
      neighborhoods = await prisma.neighborhood.findMany({
        orderBy: { name: 'asc' }
      })
      // Filtrar no código se necessário
      if (Array.isArray(neighborhoods)) {
        neighborhoods = neighborhoods.filter((n: any) => n.active !== false)
      }
    }
    
    return NextResponse.json(neighborhoods || [])
  } catch (error: any) {
    console.error('Error fetching neighborhoods:', error)
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      meta: error?.meta
    })
    
    // Retornar array vazio em vez de erro para não quebrar a página
    return NextResponse.json([], { status: 200 })
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
