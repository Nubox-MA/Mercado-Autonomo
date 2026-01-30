# 🔧 Adicionar Variáveis de Ambiente na Vercel - Passo a Passo

## ⚠️ Problema
A aplicação está dando erro 500 porque as variáveis de ambiente não estão configuradas na Vercel.

## ✅ Solução: Adicionar Variáveis

### Passo 1: Acessar Settings

1. Na Vercel, vá no projeto **Mercado Autônomo**
2. Clique na aba **Settings** (no topo)
3. No menu lateral esquerdo, procure por **Environment Variables**
4. Clique em **Environment Variables**

### Passo 2: Adicionar cada variável

Clique no botão **"Add Environment Variable"** (preto, no canto superior direito) e adicione uma por uma:

#### Variável 1: DATABASE_URL
- **Key:** `DATABASE_URL`
- **Value:** `postgresql://postgres.glzrizjoacjlrmkvjpsc:MG_Nubox2026@aws-1-sa-east-1.pooler.supabase.com:5432/postgres`
- **Environments:** ✅ Production ✅ Preview ✅ Development
- Clique em **Save**

#### Variável 2: JWT_SECRET
- **Key:** `JWT_SECRET`
- **Value:** `H2y06yL2H4m4Ap9RmGe/zl5PHHFAHIWluI/GQH/TGjk=`
- **Environments:** ✅ Production ✅ Preview ✅ Development
- Clique em **Save**

#### Variável 3: CLOUDINARY_CLOUD_NAME
- **Key:** `CLOUDINARY_CLOUD_NAME`
- **Value:** `dtzkrgphn`
- **Environments:** ✅ Production ✅ Preview ✅ Development
- Clique em **Save**

#### Variável 4: CLOUDINARY_API_KEY
- **Key:** `CLOUDINARY_API_KEY`
- **Value:** `371925975321998`
- **Environments:** ✅ Production ✅ Preview ✅ Development
- Clique em **Save**

#### Variável 5: CLOUDINARY_API_SECRET
- **Key:** `CLOUDINARY_API_SECRET`
- **Value:** (o valor que você revelou no Cloudinary - começa com `uP3AEUDd...`)
- **Environments:** ✅ Production ✅ Preview ✅ Development
- Clique em **Save**

#### Variável 6: UPLOAD_MODE
- **Key:** `UPLOAD_MODE`
- **Value:** `cloudinary`
- **Environments:** ✅ Production ✅ Preview ✅ Development
- Clique em **Save**

### Passo 3: Verificar se aparecem na lista

Depois de adicionar todas, você deve ver uma lista com as 6 variáveis.

### Passo 4: Fazer novo deploy

1. Vá em **Deployments**
2. Clique nos **três pontos** (⋯) do último deploy
3. Clique em **Redeploy**
4. Aguarde completar

---

## 🔍 Verificar Logs de Runtime (se ainda não funcionar)

Se ainda der erro depois de adicionar as variáveis:

1. Na Vercel, vá em **Deployments**
2. Clique no último deploy
3. Vá na aba **Logs** (não "Build Logs", mas "Logs" de runtime)
4. Procure por erros relacionados a:
   - `DATABASE_URL`
   - `PrismaClientInitializationError`
   - `Can't reach database server`
   - `P1001`

Isso vai mostrar o erro exato!
