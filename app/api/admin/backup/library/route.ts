import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

// Função auxiliar para verificar/criar tabela
async function ensureBackupTable() {
  try {
    // Tentar uma query simples para verificar se a tabela existe
    await prisma.$queryRaw`SELECT 1 FROM "backups" LIMIT 1`
    return { exists: true, error: null }
  } catch (error: any) {
    console.log('Tabela backups não encontrada, tentando criar...', error.code, error.message)
    
    // Se a tabela não existe, tentar criá-la
    const errorMsg = String(error.message || '').toLowerCase()
    const errorCode = String(error.code || '')
    
    if (
      errorCode === 'P2021' || 
      errorCode === '42P01' || 
      errorMsg.includes('does not exist') ||
      errorMsg.includes('relation') ||
      errorMsg.includes('table')
    ) {
      try {
        console.log('Criando tabela backups...')
        
        // Criar tabela usando SQL raw (sem IF NOT EXISTS para evitar problemas)
        // Primeiro, tentar criar a tabela
        try {
          await prisma.$executeRawUnsafe(`
            CREATE TABLE "backups" (
              "id" TEXT NOT NULL PRIMARY KEY,
              "data" TEXT NOT NULL,
              "notes" TEXT,
              "createdBy" TEXT,
              "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
          `)
          console.log('Tabela backups criada!')
        } catch (tableError: any) {
          // Se a tabela já existe, ignorar o erro
          if (!tableError.message?.includes('already exists') && 
              !tableError.message?.includes('duplicate') &&
              tableError.code !== '42P07') {
            throw tableError
          }
          console.log('Tabela backups já existe')
        }
        
        // Criar índice
        try {
          await prisma.$executeRawUnsafe(`
            CREATE INDEX "backups_createdAt_idx" ON "backups"("createdAt")
          `)
          console.log('Índice criado!')
        } catch (indexError: any) {
          // Se o índice já existe, ignorar o erro
          if (!indexError.message?.includes('already exists') && 
              !indexError.message?.includes('duplicate') &&
              indexError.code !== '42P07') {
            throw indexError
          }
          console.log('Índice já existe')
        }
        
        // Verificar se a tabela foi criada com sucesso
        await prisma.$queryRaw`SELECT 1 FROM "backups" LIMIT 1`
        
        console.log('Tabela backups criada/verificada com sucesso!')
        return { exists: true, created: true, error: null }
      } catch (createError: any) {
        console.error('═══════════════════════════════════════════════════════')
        console.error('ERRO AO CRIAR TABELA AUTOMATICAMENTE:')
        console.error('═══════════════════════════════════════════════════════')
        console.error('Código:', createError.code)
        console.error('Mensagem:', createError.message)
        console.error('Stack:', createError.stack)
        console.error('Erro completo:', JSON.stringify(createError, null, 2))
        console.error('═══════════════════════════════════════════════════════')
        console.error('SOLUÇÃO: Execute o SQL manualmente no Supabase SQL Editor')
        console.error('═══════════════════════════════════════════════════════')
        
        return { 
          exists: false, 
          error: createError.message || 'Erro desconhecido ao criar tabela',
          code: createError.code,
          fullError: String(createError),
          needsManualCreation: true
        }
      }
    }
    return { exists: false, error: error.message || 'Erro desconhecido', code: error.code }
  }
}

// GET - Listar backups salvos (apenas os 3 mais recentes)
export async function GET(req: NextRequest) {
  const auth = await authMiddleware(req, true)

  if (!auth.authorized || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    // Verificar/criar tabela
    const tableCheck = await ensureBackupTable()
    if (!tableCheck.exists) {
      console.error('═══════════════════════════════════════════════════════')
      console.error('TABELA DE BACKUPS NÃO ENCONTRADA!')
      console.error('═══════════════════════════════════════════════════════')
      console.error('Erro:', tableCheck.error)
      console.error('Código:', tableCheck.code)
      console.error('Criação manual necessária:', tableCheck.needsManualCreation)
      console.error('═══════════════════════════════════════════════════════')
      
      const sqlCode = `CREATE TABLE IF NOT EXISTS "backups" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "data" TEXT NOT NULL,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "backups_createdAt_idx" ON "backups"("createdAt");`
      
      return NextResponse.json(
        { 
          error: 'Tabela de backups não encontrada no banco de dados',
          details: tableCheck.error || 'A tabela precisa ser criada manualmente no Supabase',
          code: tableCheck.code,
          sql: sqlCode,
          migrationNeeded: true,
          needsManualCreation: true,
          instructions: 'Execute o SQL acima no Supabase SQL Editor para criar a tabela'
        },
        { status: 500 }
      )
    }

    // Tentar buscar backups - se falhar, pode ser que a tabela não exista
    let backups
    try {
      backups = await prisma.backup.findMany({
        orderBy: { createdAt: 'desc' },
        take: 3, // Apenas os 3 mais recentes
        select: {
          id: true,
          notes: true,
          createdBy: true,
          createdAt: true,
          data: true, // Precisamos do data para calcular tamanho
        },
      })
    } catch (findError: any) {
      // Se der erro ao buscar, pode ser que a tabela não exista ou esteja incompleta
      const findErrorMsg = String(findError.message || '').toLowerCase()
      const findErrorCode = String(findError.code || '')
      
      if (
        findErrorCode === 'P2021' || 
        findErrorCode === 'P1001' ||
        findErrorCode === '42P01' ||
        findErrorMsg.includes('does not exist') || 
        findErrorMsg.includes('backups') ||
        findErrorMsg.includes('relation') ||
        findErrorMsg.includes('table') ||
        findErrorMsg.includes('no such table') ||
        findErrorMsg.includes('column') ||
        findErrorMsg.includes('missing')
      ) {
        console.error('Erro ao buscar backups - tabela pode estar incompleta:', findError)
        throw findError // Re-lançar para ser capturado pelo catch externo
      }
      throw findError
    }

    // Calcular tamanho (usar Buffer.byteLength para Node.js)
    const backupsWithSize = backups.map((backup) => {
      const sizeInBytes = Buffer.byteLength(backup.data, 'utf8')
      return {
        id: backup.id,
        notes: backup.notes,
        createdBy: backup.createdBy,
        createdAt: backup.createdAt.toISOString(),
        size: sizeInBytes,
      }
    })

    return NextResponse.json({ backups: backupsWithSize })
  } catch (error: any) {
    console.error('List backups error:', error)
    console.error('Error code:', error.code)
    console.error('Error message:', error.message)
    console.error('Error meta:', error.meta)
    console.error('Full error:', JSON.stringify(error, null, 2))
    
    // Verificar se é erro de tabela não encontrada
    const errorMessage = String(error.message || '').toLowerCase()
    const errorCode = String(error.code || '')
    
    if (
      errorCode === 'P2021' || 
      errorCode === 'P1001' ||
      errorCode === '42P01' ||
      errorCode === '42703' || // undefined_column
      errorMessage.includes('does not exist') || 
      errorMessage.includes('backups') ||
      errorMessage.includes('relation') ||
      errorMessage.includes('table') ||
      errorMessage.includes('no such table') ||
      errorMessage.includes('column') ||
      errorMessage.includes('missing') ||
      errorMessage.includes('undefined column')
    ) {
      return NextResponse.json(
        { 
          error: 'Tabela de backups não encontrada no banco de dados',
          details: 'Execute o SQL abaixo no Supabase SQL Editor para criar a tabela:',
          sql: `CREATE TABLE IF NOT EXISTS "backups" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "data" TEXT NOT NULL,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "backups_createdAt_idx" ON "backups"("createdAt");`,
          migrationNeeded: true,
          sqlFile: 'CRIAR_TABELA_BACKUPS.sql'
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Erro ao listar backups', 
        details: error.message || 'Erro desconhecido',
        code: error.code || 'UNKNOWN',
        meta: error.meta
      },
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
    // Verificar/criar tabela
    const tableCheck = await ensureBackupTable()
    if (!tableCheck.exists) {
      console.error('═══════════════════════════════════════════════════════')
      console.error('TABELA DE BACKUPS NÃO ENCONTRADA (POST)!')
      console.error('═══════════════════════════════════════════════════════')
      console.error('Erro:', tableCheck.error)
      console.error('Código:', tableCheck.code)
      console.error('═══════════════════════════════════════════════════════')
      
      const sqlCode = `CREATE TABLE IF NOT EXISTS "backups" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "data" TEXT NOT NULL,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "backups_createdAt_idx" ON "backups"("createdAt");`
      
      return NextResponse.json(
        { 
          error: 'Tabela de backups não encontrada no banco de dados',
          details: tableCheck.error || 'A tabela precisa ser criada manualmente no Supabase',
          code: tableCheck.code,
          sql: sqlCode,
          migrationNeeded: true,
          needsManualCreation: true,
          instructions: 'Execute o SQL acima no Supabase SQL Editor para criar a tabela'
        },
        { status: 500 }
      )
    }

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
    console.error('Error code:', error.code)
    console.error('Error message:', error.message)
    console.error('Error meta:', error.meta)
    console.error('Full error:', JSON.stringify(error, null, 2))
    
    // Verificar se é erro de tabela não encontrada
    const errorMessage = String(error.message || '').toLowerCase()
    const errorCode = String(error.code || '')
    
    if (
      errorCode === 'P2021' || 
      errorCode === 'P1001' ||
      errorCode === '42P01' ||
      errorCode === '42703' || // undefined_column
      errorMessage.includes('does not exist') || 
      errorMessage.includes('backups') ||
      errorMessage.includes('relation') ||
      errorMessage.includes('table') ||
      errorMessage.includes('no such table') ||
      errorMessage.includes('column') ||
      errorMessage.includes('missing') ||
      errorMessage.includes('undefined column')
    ) {
      return NextResponse.json(
        { 
          error: 'Tabela de backups não encontrada no banco de dados',
          details: 'Execute o SQL abaixo no Supabase SQL Editor para criar a tabela:',
          sql: `CREATE TABLE IF NOT EXISTS "backups" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "data" TEXT NOT NULL,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "backups_createdAt_idx" ON "backups"("createdAt");`,
          migrationNeeded: true,
          sqlFile: 'CRIAR_TABELA_BACKUPS.sql'
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Erro ao adicionar backup', 
        details: error.message || 'Erro desconhecido',
        code: error.code || 'UNKNOWN',
        meta: error.meta
      },
      { status: 500 }
    )
  }
}
