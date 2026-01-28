import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const auth = await authMiddleware(req)

  if (!auth.authorized || !auth.userId) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const userRecord = await prisma.user.findUnique({
      where: { id: auth.userId },
      include: {
        neighborhood: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!userRecord) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    const { password, ...user } = userRecord
    return NextResponse.json({ user })
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar usuário' },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  const auth = await authMiddleware(req)

  if (!auth.authorized || !auth.userId) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { address, phone, neighborhoodId, photoUrl } = body

    const updateData: any = {}
    if (address !== undefined) updateData.address = address || null
    if (phone !== undefined) {
      if (phone) {
        const cleanPhone = phone.replace(/\D/g, '')
        if (cleanPhone.length !== 11) {
          return NextResponse.json({ error: 'Número de telefone inexistente. Use o DDD + 9 dígitos.' }, { status: 400 })
        }
        updateData.phone = cleanPhone
      } else {
        updateData.phone = null
      }
    }
    if (photoUrl !== undefined) updateData.photoUrl = photoUrl || null
    if (neighborhoodId !== undefined) {
      if (!neighborhoodId) {
        updateData.neighborhoodId = null
      } else {
        const neighborhood = await prisma.neighborhood.findUnique({
          where: { id: neighborhoodId },
        })
        if (neighborhood) {
          updateData.neighborhoodId = neighborhood.id
        } else {
          updateData.neighborhoodId = null
        }
      }
    }

    const updatedUserRecord = await prisma.user.update({
      where: { id: auth.userId },
      data: updateData,
      include: {
        neighborhood: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    const { password, ...updatedUser } = updatedUserRecord
    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error('Update profile error:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar perfil' },
      { status: 500 }
    )
  }
}
