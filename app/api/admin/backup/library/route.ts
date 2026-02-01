import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

// GET - Listar backups salvos (apenas os 3 mais recentes)
export async function GET(req: NextRequest) {
  const auth = await authMiddleware(req, true)

  if (!auth.authorized || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const backups = await prisma.backup.findMany({
      orderBy: { createdAt: 'desc' },
      take: 3, // Apenas os 3 mais recentes
      select: {
        id: true,
        notes: true,
        createdBy: true,
        createdAt: true,
        data: false, // Não retornar o JSON completo na listagem
      },
    })

    // Calcular tamanho aproximado (sem buscar o JSON completo)
    const backupsWithSize = await Promise.all(
      backups.map(async (backup) => {
        const fullBackup = await prisma.backup.findUnique({
          where: { id: backup.id },
          select: { data: true },
        })
        const sizeInBytes = fullBackup ? new Blob([fullBackup.data]).size : 0
        return {
          ...backup,
          size: sizeInBytes,
        }
      })
    )

    return NextResponse.json({ backups: backupsWithSize })
  } catch (error: any) {
    console.error('List backups error:', error)
    return NextResponse.json(
      { error: 'Erro ao listar backups', details: error.message },
      { status: 500 }
    )
  }
}

// POST - Adicionar backup à biblioteca
export async function POST(req: NextRequest) {
  const auth = await authMiddleware(req, true)

  if (!auth.authorized || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { backup, notes, createdBy } = body

    if (!backup || !backup.data) {
      return NextResponse.json(
        { error: 'Formato de backup inválido' },
        { status: 400 }
      )
    }

    // Validar formato do backup
    if (!backup.version || !backup.createdAt) {
      return NextResponse.json(
        { error: 'Backup inválido: falta informações de versão ou data' },
        { status: 400 }
      )
    }

    // Converter backup para JSON string
    const backupJson = JSON.stringify(backup)

    // Criar novo backup
    const newBackup = await prisma.backup.create({
      data: {
        data: backupJson,
        notes: notes || null,
        createdBy: createdBy || null,
      },
    })

    // Verificar se há mais de 3 backups e deletar os mais antigos
    const allBackups = await prisma.backup.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    })

    if (allBackups.length > 3) {
      // Deletar backups mais antigos (manter apenas os 3 mais recentes)
      const backupsToDelete = allBackups.slice(3)
      await prisma.backup.deleteMany({
        where: {
          id: {
            in: backupsToDelete.map((b) => b.id),
          },
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Backup adicionado à biblioteca com sucesso!',
      backup: {
        id: newBackup.id,
        createdAt: newBackup.createdAt,
      },
    })
  } catch (error: any) {
    console.error('Add backup error:', error)
    return NextResponse.json(
      { error: 'Erro ao adicionar backup', details: error.message },
      { status: 500 }
    )
  }
}
