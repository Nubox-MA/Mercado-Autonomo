# 🔍 Verificar Configuração do Cloudinary na Vercel

## ⚠️ Problema
Upload de imagens dando erro 500. Provavelmente as variáveis do Cloudinary não estão configuradas corretamente.

## ✅ Verificar Variáveis na Vercel

### Passo 1: Verificar se todas as variáveis existem

Na Vercel, vá em **Settings** → **Environment Variables** e verifique se aparecem estas 3 variáveis:

1. ✅ `CLOUDINARY_CLOUD_NAME` = `dtzkrgphn`
2. ✅ `CLOUDINARY_API_KEY` = `371925975321998`
3. ✅ `CLOUDINARY_API_SECRET` = (o valor que você revelou)
4. ✅ `UPLOAD_MODE` = `cloudinary`

### Passo 2: Se alguma estiver faltando, adicionar

1. Clique em **"Add Environment Variable"**
2. Adicione a variável faltante
3. **Marque todas as opções:** Production, Preview, Development
4. Clique em **Save**

### Passo 3: Verificar valores

Clique no ícone de "olho" 👁️ ao lado de cada variável para ver se os valores estão corretos:

- `CLOUDINARY_CLOUD_NAME` deve ser: `dtzkrgphn`
- `CLOUDINARY_API_KEY` deve ser: `371925975321998`
- `CLOUDINARY_API_SECRET` deve começar com: `uP3AEUDd...` (o valor completo que você revelou)
- `UPLOAD_MODE` deve ser: `cloudinary` (exatamente assim, minúsculo)

### Passo 4: Fazer novo deploy

Depois de verificar/corrigir:

1. Vá em **Deployments**
2. Clique nos três pontos do último deploy
3. Clique em **Redeploy**
4. Aguarde completar

---

## 🔍 Verificar Logs (se ainda não funcionar)

1. Na Vercel, vá em **Deployments** → último deploy → **Logs**
2. Procure por mensagens como:
   - `Cloudinary configurado: dtzkrgphn` (deve aparecer se estiver OK)
   - `Cloudinary não configurado` (se aparecer, as variáveis não estão corretas)
   - `Cloudinary upload error:` (mostra o erro específico)

Me avise o que você encontrou!
