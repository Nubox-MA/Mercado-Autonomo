-- Código de barras para deduplicar catálogo (mesmo EAN, vários pro_idProduto na MJ)
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "barcode" TEXT;
CREATE INDEX IF NOT EXISTS "products_barcode_idx" ON "products"("barcode");
