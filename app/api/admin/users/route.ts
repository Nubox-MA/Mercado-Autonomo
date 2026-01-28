import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const auth = await authMiddleware(req, true)

  if (!auth.authorized) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          cpf: true,
          phone: true,
          role: true,
          createdAt: true,
          lastLogin: true,
          photoUrl: true,
          address: true,
          neighborhood: {
            select: {
              name: true
            }
          }
        },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Get users error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar usuários' },
      { status: 500 }
    )
  }
}

