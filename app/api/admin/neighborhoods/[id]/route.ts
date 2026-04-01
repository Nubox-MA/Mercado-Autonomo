import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware'

interface RouteParams {
  params: {
    id: string
  }
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const auth = await authMiddleware(request, true)
    if (!auth.authorized) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const id = params.id

    if (!id) {
      return NextResponse.json({ error: 'ID não fornecido' }, { status: 400 })
    }

    let body
    try {
      body = await request.json()
    } catch (e) {
      console.error('PUT - Erro ao ler body:', e)
      return NextResponse.json({ error: 'Erro ao processar dados' }, { status: 400 })
    }
    
    const {
      name,
      active,
      photoUrl,
      externalId,
      externalSystem,
      saurusDominio,
      saurusTabPrecoId,
      saurusSyncEnabled,
      displayOrder,
      clearSaurusPdvKey,
    } = body

    const hasSaurusPdvKeyUpdate = typeof body.saurusPdvKey === 'string'

    const hasAnyField =
      name !== undefined ||
      active !== undefined ||
      photoUrl !== undefined ||
      externalId !== undefined ||
      externalSystem !== undefined ||
      saurusDominio !== undefined ||
      saurusTabPrecoId !== undefined ||
      saurusSyncEnabled !== undefined ||
      displayOrder !== undefined ||
      hasSaurusPdvKeyUpdate ||
      clearSaurusPdvKey === true

    if (!hasAnyField) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
    }

    // Validar nome se fornecido
    if (name !== undefined) {
      if (!name || typeof name !== 'string' || name.trim() === '') {
        return NextResponse.json({ error: 'Nome inválido' }, { status: 400 })
      }
      
      // Verificar se o nome já existe em outro registro
      try {
        const existingNeighborhood = await prisma.neighborhood.findFirst({
          where: {
            name: name.trim(),
            id: { not: id }
          }
        })
        
        if (existingNeighborhood) {
          return NextResponse.json({ error: 'Já existe um local com este nome' }, { status: 400 })
        }
      } catch (e) {
        console.error('PUT - Erro ao verificar nome duplicado:', e)
        // Continuar mesmo se houver erro na verificação
      }
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name.trim()
    if (active !== undefined) updateData.active = Boolean(active)
    if (photoUrl !== undefined) {
      if (typeof photoUrl === 'string' && photoUrl.trim() === '') {
        updateData.photoUrl = null
      } else {
        updateData.photoUrl = photoUrl || null
      }
    }

    if (externalId !== undefined) {
      updateData.externalId =
        typeof externalId === 'string' && externalId.trim() ? externalId.trim() : null
    }
    if (externalSystem !== undefined) {
      updateData.externalSystem =
        typeof externalSystem === 'string' && externalSystem.trim()
          ? externalSystem.trim()
          : null
    }
    if (saurusDominio !== undefined) {
      updateData.saurusDominio =
        typeof saurusDominio === 'string' && saurusDominio.trim()
          ? saurusDominio.trim()
          : null
    }
    if (saurusTabPrecoId !== undefined) {
      updateData.saurusTabPrecoId =
        typeof saurusTabPrecoId === 'string' && saurusTabPrecoId.trim()
          ? saurusTabPrecoId.trim()
          : null
    }
    if (saurusSyncEnabled !== undefined) {
      updateData.saurusSyncEnabled = Boolean(saurusSyncEnabled)
    }
    if (displayOrder !== undefined) {
      if (displayOrder === null || displayOrder === '') {
        updateData.displayOrder = null
      } else {
        const n = Number.parseInt(String(displayOrder), 10)
        if (!Number.isFinite(n) || n < 0) {
          return NextResponse.json({ error: 'Ordem inválida (use inteiro >= 0)' }, { status: 400 })
        }
        updateData.displayOrder = n
      }
    }
    if (clearSaurusPdvKey === true) {
      updateData.saurusPdvKey = null
    } else if (hasSaurusPdvKeyUpdate) {
      const pk = body.saurusPdvKey as string
      if (pk.trim() !== '') {
        updateData.saurusPdvKey = pk.trim()
      }
    }

    // Verificar se há dados para atualizar
    if (Object.keys(updateData).length === 0) {
      const current = await prisma.neighborhood.findUnique({ where: { id } })
      if (!current) {
        return NextResponse.json({ error: 'Local não encontrado' }, { status: 404 })
      }
      return NextResponse.json(current)
    }

    // Verificar se o registro existe antes de atualizar
    let existing
    try {
      existing = await prisma.neighborhood.findUnique({ where: { id } })
      if (!existing) {
        return NextResponse.json({ error: 'Local não encontrado' }, { status: 404 })
      }
    } catch (e) {
      console.error('PUT - Erro ao buscar registro:', e)
      return NextResponse.json({ error: 'Erro ao buscar local' }, { status: 500 })
    }

    let neighborhood
    try {
      neighborhood = await prisma.neighborhood.update({
        where: { id },
        data: updateData
      })
    } catch (e: any) {
      console.error('PUT - Erro ao atualizar no Prisma:', e)
      throw e
    }

    const { saurusPdvKey, ...rest } = neighborhood
    return NextResponse.json({
      ...rest,
      saurusPdvKeyConfigured: Boolean(saurusPdvKey?.trim()),
    })
  } catch (error: any) {
    console.error('Update neighborhood error:', error)
    console.error('Error stack:', error.stack)
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      meta: error.meta,
      name: error.name
    })
    
    // Se for erro do Prisma, retornar mensagem mais específica
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Local não encontrado' }, { status: 404 })
    }
    
    // Erro de constraint único (nome duplicado)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Já existe um local com este nome' }, { status: 400 })
    }
    
    return NextResponse.json({ 
      error: 'Erro ao atualizar local',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const auth = await authMiddleware(request, true)
    if (!auth.authorized) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const id = params.id

    if (!id) {
      return NextResponse.json({ error: 'ID não fornecido' }, { status: 400 })
    }

    await prisma.neighborhood.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete neighborhood error:', error)
    
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Local não encontrado' }, { status: 404 })
    }
    
    return NextResponse.json({ error: 'Erro ao excluir local' }, { status: 500 })
  }
}
