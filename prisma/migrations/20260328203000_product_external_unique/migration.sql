-- Garante um único produto por par (externalId, externalSystem) quando ambos preenchidos.
-- No PostgreSQL, várias linhas com externalId NULL ainda são permitidas na constraint única composta.
CREATE UNIQUE INDEX IF NOT EXISTS "products_externalId_externalSystem_key" ON "products" ("externalId", "externalSystem");
