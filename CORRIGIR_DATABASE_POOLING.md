# 🔧 Corrigir Erro de Connection Pooling - MaxClientsInSessionMode

## ⚠️ Problema
Erro ao fazer login: `MaxClientsInSessionMode: max clients reached - in Session mode max clients are limited to pool_size`

Isso acontece porque a `DATABASE_URL` está usando conexão direta (porta 5432) ao invés de connection pooling (porta 6543).

## ✅ Solução: Atualizar DATABASE_URL na Vercel

### Passo 1: Obter URL com Connection Pooling

1. Acesse o **Supabase Dashboard**
2. Vá em **Settings** → **Database**
3. Role até **Connection string**
4. Selecione **Connection pooling** (não "URI" ou "Session")
5. Escolha **Transaction mode** (recomendado para Prisma)
6. Copie a URL

A URL deve ter este formato:
```
postgresql://postgres.glzrizjoacjlrmkvjpsc:MG_Nubox2026@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**IMPORTANTE:**
- Porta deve ser **6543** (pooler) e não 5432 (direta)
- Deve incluir `?pgbouncer=true` no final

### Passo 2: Atualizar na Vercel

1. Acesse **Vercel Dashboard** → Seu projeto
2. Vá em **Settings** → **Environment Variables**
3. Encontre a variável `DATABASE_URL`
4. Clique nos **três pontos** (⋯) → **Edit**
5. Cole a nova URL com porta 6543 e `?pgbouncer=true`
6. Clique em **Save**

### Passo 3: Fazer Redeploy

1. Vá em **Deployments**
2. Clique nos **três pontos** (⋯) do último deploy
3. Clique em **Redeploy**
4. Aguarde completar

---

## 🔍 Verificar se está correto

A URL correta deve ter:
- ✅ Porta **6543** (pooler)
- ✅ `pooler.supabase.com` no hostname
- ✅ `?pgbouncer=true` no final

**Exemplo correto:**
```
postgresql://postgres.glzrizjoacjlrmkvjpsc:MG_Nubox2026@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**Exemplo incorreto (causa o erro):**
```
postgresql://postgres.glzrizjoacjlrmkvjpsc:MG_Nubox2026@aws-1-sa-east-1.pooler.supabase.com:5432/postgres
```

---

## 📚 Por que isso acontece?

Em ambientes serverless (Vercel), cada requisição pode criar uma nova conexão com o banco. O Supabase tem um limite de conexões simultâneas no modo Session (porta 5432). O connection pooling (porta 6543) permite reutilizar conexões, evitando o erro de limite excedido.
