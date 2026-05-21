-- Execute no Supabase SQL Editor (ou psql) uma vez, antes do deploy com slugs.
ALTER TABLE "neighborhoods" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "slug" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "neighborhoods_slug_key" ON "neighborhoods"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "categories_slug_key" ON "categories"("slug");
