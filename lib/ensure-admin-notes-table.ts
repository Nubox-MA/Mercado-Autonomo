import { prisma } from '@/lib/prisma'

/**
 * Garante que a tabela admin_notes exista (útil quando a migration não foi aplicada no banco em uso).
 */
export async function ensureAdminNotesTable(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await prisma.$queryRaw`SELECT 1 FROM "admin_notes" LIMIT 1`
    return { ok: true }
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string }
    const errorMsg = String(err.message || '').toLowerCase()
    const errorCode = String(err.code || '')

    const isMissingTable =
      errorCode === 'P2021' ||
      errorCode === '42P01' ||
      errorMsg.includes('does not exist') ||
      (errorMsg.includes('relation') && errorMsg.includes('admin_notes'))

    if (!isMissingTable) {
      return { ok: false, error: err.message || 'Erro ao acessar tabela admin_notes' }
    }

    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "admin_notes" (
          "id" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "title" TEXT NOT NULL,
          "content" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "admin_notes_pkey" PRIMARY KEY ("id")
        )
      `)

      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "admin_notes_userId_createdAt_idx" ON "admin_notes"("userId", "createdAt")
      `)

      try {
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "admin_notes"
          ADD CONSTRAINT "admin_notes_userId_fkey"
          FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `)
      } catch (fkErr: unknown) {
        const m = String((fkErr as Error).message || '').toLowerCase()
        if (!m.includes('already exists') && !m.includes('duplicate')) {
          console.warn('[ensureAdminNotesTable] FK:', fkErr)
        }
      }

      await prisma.$queryRaw`SELECT 1 FROM "admin_notes" LIMIT 1`
      return { ok: true }
    } catch (createError: unknown) {
      const e = createError instanceof Error ? createError.message : String(createError)
      console.error('[ensureAdminNotesTable]', createError)
      return { ok: false, error: e }
    }
  }
}
