-- Script SQL para corrigir admin e adicionar produtos
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar/Corrigir admin
-- Primeiro, deletar admin existente se houver
DELETE FROM "users" WHERE "cpf" = 'admin';

-- Criar admin novamente com hash correto
INSERT INTO "users" ("id", "name", "cpf", "role", "password", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid()::text,
  'Administrador',
  'admin',
  'ADMIN',
  '$2a$10$wVpYvCbROSqBLw9IKEG7QOf3N5IMhqky52MQ4WhNIlcN94ZZ1VAUq', -- senha: admin123
  NOW(),
  NOW()
);

-- 2. Verificar se categorias existem, se não, criar
INSERT INTO "categories" ("id", "name", "description", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'Bebidas', 'Refrigerantes, sucos e águas', NOW(), NOW()),
  (gen_random_uuid()::text, 'Snacks', 'Salgadinhos e petiscos', NOW(), NOW()),
  (gen_random_uuid()::text, 'Doces', 'Chocolates e guloseimas', NOW(), NOW()),
  (gen_random_uuid()::text, 'Higiene', 'Produtos de higiene pessoal', NOW(), NOW()),
  (gen_random_uuid()::text, 'Limpeza', 'Produtos de limpeza', NOW(), NOW())
ON CONFLICT ("name") DO NOTHING;

-- 3. Adicionar produtos de exemplo
-- Primeiro, pegar IDs das categorias
DO $$
DECLARE
  cat_bebidas_id TEXT;
  cat_snacks_id TEXT;
  cat_doces_id TEXT;
  cat_higiene_id TEXT;
  cat_limpeza_id TEXT;
  condominio1_id TEXT;
  condominio2_id TEXT;
BEGIN
  -- Pegar IDs das categorias
  SELECT id INTO cat_bebidas_id FROM "categories" WHERE "name" = 'Bebidas' LIMIT 1;
  SELECT id INTO cat_snacks_id FROM "categories" WHERE "name" = 'Snacks' LIMIT 1;
  SELECT id INTO cat_doces_id FROM "categories" WHERE "name" = 'Doces' LIMIT 1;
  SELECT id INTO cat_higiene_id FROM "categories" WHERE "name" = 'Higiene' LIMIT 1;
  SELECT id INTO cat_limpeza_id FROM "categories" WHERE "name" = 'Limpeza' LIMIT 1;
  
  -- Pegar IDs dos condomínios
  SELECT id INTO condominio1_id FROM "neighborhoods" WHERE "name" = 'Condomínio 1' LIMIT 1;
  SELECT id INTO condominio2_id FROM "neighborhoods" WHERE "name" = 'Condomínio 2' LIMIT 1;
  
  -- Criar produtos
  INSERT INTO "products" ("id", "name", "description", "price", "stock", "categoryId", "active", "createdAt", "updatedAt")
  VALUES
    (gen_random_uuid()::text, 'Coca-Cola 2L', 'Refrigerante Coca-Cola 2 litros', 8.99, 24, cat_bebidas_id, true, NOW(), NOW()),
    (gen_random_uuid()::text, 'Água Mineral 500ml', 'Água mineral sem gás', 2.50, 48, cat_bebidas_id, true, NOW(), NOW()),
    (gen_random_uuid()::text, 'Suco de Laranja 1L', 'Suco natural de laranja', 6.99, 12, cat_bebidas_id, true, NOW(), NOW()),
    (gen_random_uuid()::text, 'Doritos 150g', 'Salgadinho sabor queijo nacho', 7.99, 15, cat_snacks_id, true, NOW(), NOW()),
    (gen_random_uuid()::text, 'Ruffles 96g', 'Batata frita ondulada', 6.49, 20, cat_snacks_id, true, NOW(), NOW()),
    (gen_random_uuid()::text, 'Chocolate Lacta 90g', 'Chocolate ao leite', 5.99, 30, cat_doces_id, true, NOW(), NOW()),
    (gen_random_uuid()::text, 'Bis Xtra 45g', 'Biscoito wafer coberto com chocolate', 3.99, 25, cat_doces_id, true, NOW(), NOW()),
    (gen_random_uuid()::text, 'Sabonete Dove 90g', 'Sabonete em barra hidratante', 3.49, 18, cat_higiene_id, true, NOW(), NOW()),
    (gen_random_uuid()::text, 'Shampoo Pantene 200ml', 'Shampoo restauração', 12.99, 8, cat_higiene_id, true, NOW(), NOW()),
    (gen_random_uuid()::text, 'Detergente Ypê 500ml', 'Detergente líquido neutro', 2.99, 15, cat_limpeza_id, true, NOW(), NOW())
  ON CONFLICT DO NOTHING;
  
  -- Criar preços para os produtos nos condomínios
  -- Pegar produtos criados e adicionar preços
  INSERT INTO "product_prices" ("id", "productId", "neighborhoodId", "price", "stock", "createdAt", "updatedAt")
  SELECT 
    gen_random_uuid()::text,
    p.id,
    condominio1_id,
    p.price,
    p.stock,
    NOW(),
    NOW()
  FROM "products" p
  WHERE p."active" = true
  ON CONFLICT DO NOTHING;
  
  INSERT INTO "product_prices" ("id", "productId", "neighborhoodId", "price", "stock", "createdAt", "updatedAt")
  SELECT 
    gen_random_uuid()::text,
    p.id,
    condominio2_id,
    p.price,
    p.stock,
    NOW(),
    NOW()
  FROM "products" p
  WHERE p."active" = true
  ON CONFLICT DO NOTHING;
END $$;

-- Mensagem de sucesso
SELECT '✅ Admin corrigido e produtos adicionados com sucesso!' as resultado;
