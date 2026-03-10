-- Migration: Adicionar campos de integração externa (Saurus)
-- Execute: npx prisma db execute --file prisma/migrations/add_external_integration_fields.sql --schema prisma/schema.prisma

-- Adicionar campos de integração na tabela products
ALTER TABLE "products" 
ADD COLUMN IF NOT EXISTS "externalId" TEXT,
ADD COLUMN IF NOT EXISTS "externalSystem" TEXT;

-- Adicionar campos de integração na tabela neighborhoods
ALTER TABLE "neighborhoods" 
ADD COLUMN IF NOT EXISTS "externalId" TEXT,
ADD COLUMN IF NOT EXISTS "externalSystem" TEXT;

-- Criar índices para busca rápida
CREATE INDEX IF NOT EXISTS "products_externalId_externalSystem_idx" ON "products"("externalId", "externalSystem");
CREATE INDEX IF NOT EXISTS "neighborhoods_externalId_externalSystem_idx" ON "neighborhoods"("externalId", "externalSystem");
