CREATE TABLE IF NOT EXISTS "neighborhood_sync_logs" (
  "id" TEXT NOT NULL,
  "neighborhoodId" TEXT NOT NULL,
  "ok" BOOLEAN NOT NULL,
  "message" TEXT,
  "durationMs" INTEGER,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "summary" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "neighborhood_sync_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "neighborhood_sync_logs_neighborhoodId_finishedAt_idx"
ON "neighborhood_sync_logs" ("neighborhoodId", "finishedAt");

CREATE INDEX IF NOT EXISTS "neighborhood_sync_logs_ok_finishedAt_idx"
ON "neighborhood_sync_logs" ("ok", "finishedAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'neighborhood_sync_logs_neighborhoodId_fkey'
  ) THEN
    ALTER TABLE "neighborhood_sync_logs"
    ADD CONSTRAINT "neighborhood_sync_logs_neighborhoodId_fkey"
    FOREIGN KEY ("neighborhoodId")
    REFERENCES "neighborhoods"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
  END IF;
END $$;
