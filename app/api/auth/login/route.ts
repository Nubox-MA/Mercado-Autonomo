import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { comparePassword } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { cpf, name, phone, password } = body

    // LOGIN DO ADMINISTRADOR
    if (cpf === 'admin') {
      const admin = await prisma.user.findUnique({
        where: { cpf: 'admin' },
      })

      if (!admin) {
        return NextResponse.json({ error: 'Administrador não encontrado' }, { status: 404 })
      }

      if (!password || !admin.password) {
        return NextResponse.json({ error: 'Senha é obrigatória' }, { status: 401 })
      }

      const validPassword = await comparePassword(password, admin.password)
      if (!validPassword) {
        return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 })
      }

      await prisma.user.update({
        where: { id: admin.id },
        data: { lastLogin: new Date() },
      })

      const token = `admin-token-${admin.id}-${Date.now()}`
      return NextResponse.json({
        token,
        user: {
          id: admin.id,
          name: admin.name,
          role: admin.role,
          cpf: admin.cpf,
          phone: admin.phone || null,
          address: admin.address || null,
          neighborhoodId: admin.neighborhoodId || null,
          photoUrl: admin.photoUrl || null,
        },
      })
    }

    // LOGIN DO MORADOR
    if (!name || !phone) {
      return NextResponse.json({ error: 'Nome e telefone são obrigatórios' }, { status: 400 })
    }

    // Validar nome completo (pelo menos dois nomes)
    const nameParts = name.trim().split(/\s+/)
    if (nameParts.length < 2) {
      return NextResponse.json({ error: 'Informe seu nome completo (nome e sobrenome)' }, { status: 400 })
    }

    // Limpar telefone
    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.length !== 11) {
      return NextResponse.json({ error: 'Número de telefone inexistente. Use o DDD + 9 dígitos.' }, { status: 400 })
    }

    // Capitalizar nome
    const capitalizedName = nameParts
      .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ')

    // Buscar morador pelo NOME e TELEFONE combinados
    let user = await prisma.user.findFirst({
      where: { 
        name: capitalizedName,
        phone: cleanPhone 
      },
    })

    if (!user) {
      // Criar novo morador se não existir essa combinação exata
      user = await prisma.user.create({
        data: {
          name: capitalizedName,
          phone: cleanPhone,
          role: 'USER',
          lastLogin: new Date(),
        },
      })
    } else {
      // Atualizar apenas o último login do morador encontrado
      user = await prisma.user.update({
        where: { id: user.id },
        data: { 
          lastLogin: new Date() 
        },
      })
    }

    const token = `user-token-${user.id}-${Date.now()}`
    return NextResponse.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        cpf: user.cpf || null,
        phone: user.phone || null,
        address: user.address || null,
        neighborhoodId: user.neighborhoodId || null,
        photoUrl: user.photoUrl || null,
      },
    })

  } catch (error: any) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: `Erro ao fazer login: ${error.message}` },
      { status: 500 }
    )
  }
}
