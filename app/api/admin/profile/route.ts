import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { comparePassword, hashPassword } from '@/lib/auth'
import { z } from 'zod'

const updateProfileSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  cpf: z.string(),
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
})

export async function PUT(req: NextRequest) {
  const auth = await authMiddleware(req, true)

  if (!auth.authorized || !auth.userId) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const parseResult = updateProfileSchema.safeParse(body)
    
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors[0].message
      return NextResponse.json({ error: errorMsg === 'Required' ? 'Campos obrigatórios faltando' : errorMsg }, { status: 400 })
    }

    const { name, cpf, currentPassword, newPassword } = parseResult.data

    // Validar CPF apenas se não for o usuário admin fixo
    const isSpecialAdmin = cpf.toLowerCase() === 'admin'
    if (!isSpecialAdmin && cpf.replace(/\D/g, '').length !== 11) {
      return NextResponse.json({ error: 'CPF inválido' }, { status: 400 })
    }

    // Verificar se CPF já existe em outro usuário
    const cleanCpf = isSpecialAdmin ? 'admin' : cpf.replace(/\D/g, '')
    const existingUser = await prisma.user.findFirst({
      where: {
        cpf: cleanCpf,
        id: { not: auth.userId },
      },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'CPF já está em uso por outro usuário' },
        { status: 400 }
      )
    }

    // Se está alterando a senha, verificar senha atual
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Senha atual é obrigatória para alterar a senha' },
          { status: 400 }
        )
      }

      const user = await prisma.user.findUnique({
        where: { id: auth.userId },
      })

      if (!user || !user.password) {
        return NextResponse.json(
          { error: 'Usuário não encontrado' },
          { status: 404 }
        )
      }

      const validPassword = await comparePassword(currentPassword, user.password)
      if (!validPassword) {
        return NextResponse.json(
          { error: 'Senha atual incorreta' },
          { status: 401 }
        )
      }
    }

    // Atualizar usuário
    const updateData: any = {
      name,
      cpf: cleanCpf,
    }

    if (newPassword) {
      updateData.password = await hashPassword(newPassword)
    }

    const updatedUser = await prisma.user.update({
      where: { id: auth.userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        cpf: true,
        role: true,
      },
    })

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error('Update profile error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Erro ao atualizar perfil' },
      { status: 500 }
    )
  }
}

