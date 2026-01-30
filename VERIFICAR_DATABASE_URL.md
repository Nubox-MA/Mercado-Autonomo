# 🔍 Verificar DATABASE_URL na Vercel

## ⚠️ Problema
A aplicação está dando erro 500 ao buscar condomínios. Isso geralmente significa que a `DATABASE_URL` na Vercel está incorreta ou não está configurada.

## ✅ Solução: Verificar e Corrigir na Vercel

### Passo 1: Verificar DATABASE_URL na Vercel

1. Acesse a Vercel: https://vercel.com
2. Vá no seu projeto **Mercado Autônomo**
3. Vá em **Settings** → **Environment Variables**
4. Procure por `DATABASE_URL`
5. Verifique se está **exatamente** assim:

```
postgresql://postgres.glzrizjoacjlrmkvjpsc:MG_Nubox2026@aws-1-sa-east-1.pooler.supabase.com:5432/postgres
```

**Importante:**
- Deve usar **porta 5432** (Session pooler)
- Deve ter a senha correta: `MG_Nubox2026`
- Não pode ter espaços extras

### Passo 2: Se estiver incorreto, corrigir

1. Clique em **Edit** na variável `DATABASE_URL`
2. Cole a URL correta (acima)
3. **Marque todas as opções:**
   - ✅ Production
   - ✅ Preview  
   - ✅ Development
4. Clique em **Save**

### Passo 3: Fazer novo deploy

Depois de corrigir a variável:

1. Vá em **Deployments**
2. Clique nos três pontos do último deploy
3. Clique em **Redeploy**
4. Aguarde o deploy completar

---

## 🔄 Alternativa: Verificar logs da Vercel

Se ainda não funcionar, verifique os logs:

1. Na Vercel, vá em **Deployments**
2. Clique no último deploy
3. Vá na aba **Logs**
4. Procure por erros relacionados a:
   - `DATABASE_URL`
   - `PrismaClientInitializationError`
   - `Can't reach database server`

Isso vai mostrar exatamente qual é o problema!
