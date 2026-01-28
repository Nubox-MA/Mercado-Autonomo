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
    console.log('PUT /api/admin/neighborhoods/[id] - Iniciando...')
    
    const auth = await authMiddleware(request, true)
    if (!auth.authorized) {
      console.log('PUT - Não autorizado')
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const id = params.id

    console.log('PUT - ID recebido:', id)

    if (!id) {
      return NextResponse.json({ error: 'ID não fornecido' }, { status: 400 })
    }

    let body
    try {
      body = await request.json()
      console.log('PUT - Body recebido:', JSON.stringify(body, null, 2))
    } catch (e) {
      console.error('PUT - Erro ao ler body:', e)
      return NextResponse.json({ error: 'Erro ao processar dados' }, { status: 400 })
    }
    
    const { name, active, photoUrl } = body

    // Validar que pelo menos um campo foi fornecido
    if (name === undefined && active === undefined && photoUrl === undefined) {
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
      // Tratar photoUrl: se for string vazia ou falsy, usar null, senão usar o valor
      if (typeof photoUrl === 'string' && photoUrl.trim() === '') {
        updateData.photoUrl = null
      } else {
        updateData.photoUrl = photoUrl || null
      }
    }

    console.log('PUT - Dados para atualizar:', JSON.stringify(updateData, null, 2))
    console.log('PUT - ID do registro:', id)
    console.log('PUT - Tipo de photoUrl:', typeof updateData.photoUrl, updateData.photoUrl)

    // Verificar se há dados para atualizar
    if (Object.keys(updateData).length === 0) {
      console.log('PUT - Nenhum dado para atualizar, retornando registro atual')
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
        console.log('PUT - Registro não encontrado')
        return NextResponse.json({ error: 'Local não encontrado' }, { status: 404 })
      }
      console.log('PUT - Registro encontrado:', existing.name)
    } catch (e) {
      console.error('PUT - Erro ao buscar registro:', e)
      return NextResponse.json({ error: 'Erro ao buscar local' }, { status: 500 })
    }

    console.log('PUT - Registro encontrado, atualizando...')
    let neighborhood
    try {
      neighborhood = await prisma.neighborhood.update({
        where: { id },
        data: updateData
      })
    } catch (e: any) {
      console.error('PUT - Erro ao atualizar no Prisma:', e)
      console.error('PUT - Erro code:', e.code)
      console.error('PUT - Erro message:', e.message)
      throw e // Re-lançar para ser capturado pelo catch externo
    }

    console.log('PUT - Sucesso!', JSON.stringify(neighborhood, null, 2))
    return NextResponse.json(neighborhood)
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
