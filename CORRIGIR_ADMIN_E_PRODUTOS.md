# 🔧 Corrigir Admin e Adicionar Produtos

## ⚠️ Problemas
1. Senha do admin não funciona
2. Catálogo sem produtos

## ✅ Solução: Executar Script SQL

### Passo 1: Executar Script no Supabase

1. Acesse o Supabase: https://supabase.com
2. Vá em **SQL Editor**
3. Clique em **New query**
4. Abra o arquivo `prisma/fix-admin-and-products.sql`
5. Copie TODO o conteúdo
6. Cole no SQL Editor
7. Clique em **Run** (ou Ctrl+Enter)

Isso vai:
- ✅ Recriar o admin com senha correta
- ✅ Criar categorias (se não existirem)
- ✅ Adicionar 10 produtos de exemplo
- ✅ Adicionar preços para ambos os condomínios

### Passo 2: Testar Login Admin

Depois de executar o script:

1. Acesse a aplicação: `https://mercadoautonomo.vercel.app`
2. Vá em `/admin/login`
3. Faça login com:
   - **Usuário:** `admin`
   - **Senha:** `admin123`

### Passo 3: Verificar Catálogo

1. Selecione um condomínio
2. Verifique se aparecem os produtos no catálogo

---

## 🔍 Se ainda não funcionar

### Verificar Admin no Supabase:

1. No Supabase, vá em **Table Editor**
2. Abra a tabela `users`
3. Procure por um registro com `cpf = 'admin'`
4. Verifique se existe e se o `role = 'ADMIN'`

### Verificar Produtos:

1. No Supabase, vá em **Table Editor**
2. Abra a tabela `products`
3. Verifique se há produtos criados
4. Abra a tabela `product_prices`
5. Verifique se há preços para os condomínios

Me avise se funcionou ou se ainda há algum problema!
