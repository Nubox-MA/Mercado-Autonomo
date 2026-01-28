import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  try {
    if (!prisma.setting) {
      console.error('Tabela Setting não encontrada no Prisma Client')
      return NextResponse.json({})
    }
    const settings = await prisma.setting.findMany()
    const settingsMap = settings.reduce((acc: any, setting) => {
      acc[setting.key] = setting.value
      return acc
    }, {})

    return NextResponse.json(settingsMap)
  } catch (error) {
    console.error('Erro ao buscar configurações:', error)
    return NextResponse.json({}) // Retorna vazio em vez de erro para não quebrar o footer
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authMiddleware(request, true)
    if (!auth.authorized) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { key, value } = await request.json()
    console.log(`Atualizando configuração: ${key} = ${value}`)

    if (!key) {
      return NextResponse.json({ error: 'Chave não fornecida' }, { status: 400 })
    }

    if (!prisma.setting) {
      throw new Error('Prisma Client não possui o modelo Setting')
    }

    const setting = await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    })

    return NextResponse.json(setting)
  } catch (error: any) {
    console.error('Error updating setting:', error)
    return NextResponse.json({ error: `Erro ao atualizar configuração: ${error.message}` }, { status: 500 })
  }
}
