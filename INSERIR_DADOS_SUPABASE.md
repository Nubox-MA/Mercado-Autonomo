# 📦 Inserir Dados no Supabase (Método Alternativo)

## ⚠️ Problema
O seed via Prisma está dando erro "Circuit breaker open" (Supabase bloqueou conexão temporariamente).

## ✅ Solução: Inserir dados diretamente via SQL

### Passo 1: Executar no Supabase

1. Acesse o Supabase: https://supabase.com
2. Vá em **SQL Editor**
3. Clique em **New query**
4. Copie TODO o conteúdo do arquivo `prisma/seed-data.sql`
5. Cole no SQL Editor
6. Clique em **Run** (ou Ctrl+Enter)

### Passo 2: Verificar

1. Vá em **Table Editor**
2. Verifique se aparecem:
   - Tabela `users` com o admin
   - Tabela `categories` com 5 categorias
   - Tabela `neighborhoods` com "Condomínio 1" e "Condomínio 2"

---

## 🔄 Alternativa: Aguardar e tentar seed novamente

Se preferir usar o seed do Prisma:

1. **Aguarde 5-10 minutos** (o Supabase libera o circuit breaker)
2. Tente executar novamente:
   ```bash
   npx prisma db seed
   ```

Mas o método SQL é mais rápido e confiável!
