-- AlterTable
ALTER TABLE "neighborhoods" ADD COLUMN IF NOT EXISTS "saurusPdvKey" TEXT;
ALTER TABLE "neighborhoods" ADD COLUMN IF NOT EXISTS "saurusDominio" TEXT;
ALTER TABLE "neighborhoods" ADD COLUMN IF NOT EXISTS "saurusTabPrecoId" TEXT;
ALTER TABLE "neighborhoods" ADD COLUMN IF NOT EXISTS "saurusSyncEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "neighborhoods" ADD COLUMN IF NOT EXISTS "saurusLastSyncAt" TIMESTAMP(3);
ALTER TABLE "neighborhoods" ADD COLUMN IF NOT EXISTS "saurusLastSyncOk" BOOLEAN;
ALTER TABLE "neighborhoods" ADD COLUMN IF NOT EXISTS "saurusLastSyncMessage" TEXT;
ALTER TABLE "neighborhoods" ADD COLUMN IF NOT EXISTS "saurusLastSyncSummary" TEXT;
