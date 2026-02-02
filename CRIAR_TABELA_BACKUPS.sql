-- Execute este SQL no Supabase SQL Editor para criar a tabela de backups
-- Vá em: Supabase Dashboard → SQL Editor → New Query → Cole este código → Run

CREATE TABLE IF NOT EXISTS "backups" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "data" TEXT NOT NULL,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "backups_createdAt_idx" ON "backups"("createdAt");

-- Verificar se foi criado
SELECT * FROM "backups" LIMIT 1;
