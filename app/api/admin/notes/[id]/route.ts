import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { ensureAdminNotesTable } from '@/lib/ensure-admin-notes-table'

const TITLE_MAX = 200
const CONTENT_MAX = 20000

function devPayload(e: unknown) {
  if (process.env.NODE_ENV !== 'development') return {}
  const msg = e instanceof Error ? e.message : String(e)
  const code =
    e && typeof e === 'object' && 'code' in e ? String((e as { code?: string }).code) : undefined
  return { debug: msg, code }
}

interface RouteParams {
  params: { id: string }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const auth = await authMiddleware(request, true)
  if (!auth.authorized || !auth.userId) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { id } = params

  let body: { title?: string; content?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const content =
    typeof body.content === 'string' ? body.content.slice(0, CONTENT_MAX) : ''

  if (!title) {
    return NextResponse.json({ error: 'Informe um título' }, { status: 400 })
  }
  if (title.length > TITLE_MAX) {
    return NextResponse.json({ error: `Título deve ter no máximo ${TITLE_MAX} caracteres` }, { status: 400 })
  }

  const ensured = await ensureAdminNotesTable()
  if (!ensured.ok) {
    return NextResponse.json(
      { error: `Banco: ${ensured.error}. Verifique DATABASE_URL e permissões.` },
      { status: 503 }
    )
  }

  try {
    const existing = await prisma.adminNote.findFirst({
      where: { id, userId: auth.userId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Anotação não encontrada' }, { status: 404 })
    }

    const note = await prisma.adminNote.update({
      where: { id },
      data: {
        title: title.slice(0, TITLE_MAX),
        content,
      },
    })

    return NextResponse.json(note)
  } catch (e: unknown) {
    console.error('[admin/notes PUT]', e)
    return NextResponse.json(
      { error: 'Erro ao atualizar anotação', ...devPayload(e) },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await authMiddleware(request, true)
  if (!auth.authorized || !auth.userId) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { id } = params

  const ensured = await ensureAdminNotesTable()
  if (!ensured.ok) {
    return NextResponse.json(
      { error: `Banco: ${ensured.error}. Verifique DATABASE_URL e permissões.` },
      { status: 503 }
    )
  }

  try {
    const existing = await prisma.adminNote.findFirst({
      where: { id, userId: auth.userId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Anotação não encontrada' }, { status: 404 })
    }

    await prisma.adminNote.delete({ where: { id } })

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    console.error('[admin/notes DELETE]', e)
    return NextResponse.json(
      { error: 'Erro ao excluir anotação', ...devPayload(e) },
      { status: 500 }
    )
  }
}
