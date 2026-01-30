-- Script SQL para popular o banco Supabase diretamente
-- Execute este script no SQL Editor do Supabase

-- 1. Criar usuário admin
INSERT INTO "users" ("id", "name", "cpf", "role", "password", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid()::text,
  'Administrador',
  'admin',
  'ADMIN',
  '$2a$10$wVpYvCbROSqBLw9IKEG7QOf3N5IMhqky52MQ4WhNIlcN94ZZ1VAUq', -- senha: admin123 (hash bcrypt)
  NOW(),
  NOW()
)
ON CONFLICT ("cpf") DO NOTHING;

-- 2. Criar categorias
INSERT INTO "categories" ("id", "name", "description", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'Bebidas', 'Refrigerantes, sucos e águas', NOW(), NOW()),
  (gen_random_uuid()::text, 'Snacks', 'Salgadinhos e petiscos', NOW(), NOW()),
  (gen_random_uuid()::text, 'Doces', 'Chocolates e guloseimas', NOW(), NOW()),
  (gen_random_uuid()::text, 'Higiene', 'Produtos de higiene pessoal', NOW(), NOW()),
  (gen_random_uuid()::text, 'Limpeza', 'Produtos de limpeza', NOW(), NOW())
ON CONFLICT ("name") DO NOTHING;

-- 3. Criar condomínios
INSERT INTO "neighborhoods" ("id", "name", "deliveryFee", "active", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'Condomínio 1', 0, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'Condomínio 2', 0, true, NOW(), NOW())
ON CONFLICT ("name") DO UPDATE SET "active" = true;

-- Mensagem de sucesso
SELECT '✅ Dados iniciais criados com sucesso!' as resultado;
