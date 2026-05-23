ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "barcode" TEXT;
CREATE INDEX IF NOT EXISTS "products_barcode_idx" ON "products"("barcode");
