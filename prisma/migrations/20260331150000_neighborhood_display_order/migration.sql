ALTER TABLE "neighborhoods"
ADD COLUMN IF NOT EXISTS "displayOrder" INTEGER;

CREATE INDEX IF NOT EXISTS "neighborhoods_displayOrder_idx"
ON "neighborhoods" ("displayOrder");
