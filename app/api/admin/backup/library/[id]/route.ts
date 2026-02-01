import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

// GET - Baixar backup específico
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authMiddleware(req, true)

  if (!auth.authorized || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const { id } = params

    const backup = await prisma.backup.findUnique({
      where: { id },
    })

    if (!backup) {
      return NextResponse.json(
        { error: 'Backup não encontrado' },
        { status: 404 }
      )
    }

    // Parse do JSON e retornar
    const backupData = JSON.parse(backup.data)

    return NextResponse.json(backupData, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="backup-${backup.createdAt.toISOString().split('T')[0]}.json"`,
      },
    })
  } catch (error: any) {
    console.error('Download backup error:', error)
    return NextResponse.json(
      { error: 'Erro ao baixar backup', details: error.message },
      { status: 500 }
    )
  }
}

// DELETE - Deletar backup (opcional)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authMiddleware(req, true)

  if (!auth.authorized || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const { id } = params

    await prisma.backup.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Backup deletado com sucesso!',
    })
  } catch (error: any) {
    console.error('Delete backup error:', error)
    return NextResponse.json(
      { error: 'Erro ao deletar backup', details: error.message },
      { status: 500 }
    )
  }
}
