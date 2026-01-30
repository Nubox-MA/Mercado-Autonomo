# 🔧 Corrigir Erro "Invalid cloud_name"

## ❌ Erro atual:
```
Erro ao fazer upload no Cloudinary: Invalid cloud_name dtzkrgphn
```

## ✅ Solução:

### **Passo 1: Verificar o cloud_name no Cloudinary**

1. Acesse: https://console.cloudinary.com/
2. Vá em **Configurações → Chaves de API**
3. **Copie o "Nome da nuvem"** (deve ser `dtzkrgphn`)

---

### **Passo 2: Verificar variáveis de ambiente na Vercel**

1. Acesse: https://vercel.com/
2. Vá em **Projeto → Settings → Environment Variables**
3. **Verifique estas variáveis:**

   | Variável | Valor Esperado | Status |
   |----------|---------------|--------|
   | `CLOUDINARY_CLOUD_NAME` | `dtzkrgphn` (sem espaços, sem aspas) | ⚠️ Verificar |
   | `CLOUDINARY_API_KEY` | `371925975321998` | ⚠️ Verificar |
   | `CLOUDINARY_API_SECRET` | `*************` (o valor completo, não mascarado) | ⚠️ Verificar |
   | `UPLOAD_MODE` | `cloudinary` (exatamente assim, minúsculo) | ⚠️ Verificar |

---

### **Passo 3: Problemas comuns**

#### ❌ **Problema 1: Espaços ou caracteres extras**
```
❌ ERRADO: "dtzkrgphn"  (com aspas)
❌ ERRADO: dtzkrgphn   (com espaços no final)
✅ CORRETO: dtzkrgphn
```

#### ❌ **Problema 2: UPLOAD_MODE incorreto**
```
❌ ERRADO: Cloudinary
❌ ERRADO: CLOUDINARY
❌ ERRADO: cloudinary (com espaço)
✅ CORRETO: cloudinary
```

#### ❌ **Problema 3: API Secret incorreto**
- O API Secret no Cloudinary está **mascarado** (`*************`)
- Você precisa **copiar o valor completo** quando criou a chave
- Se não tiver o valor, você precisa **gerar uma nova chave de API**

---

### **Passo 4: Se não tiver o API Secret**

1. No Cloudinary, vá em **Chaves de API**
2. Clique em **"+ Gerar nova chave de API"**
3. **Copie o "Segredo da API"** imediatamente (ele só aparece uma vez!)
4. Atualize a variável `CLOUDINARY_API_SECRET` na Vercel com esse novo valor
5. **IMPORTANTE:** Se você gerar uma nova chave, também precisa atualizar o `CLOUDINARY_API_KEY` com o novo valor

---

### **Passo 5: Atualizar variáveis na Vercel**

1. Para cada variável:
   - Clique em **"Edit"** (ou **"Add"** se não existir)
   - **Cole o valor** (sem aspas, sem espaços)
   - Selecione **"Production"** (e também "Preview" e "Development" se quiser)
   - Clique em **"Save"**

2. **Após atualizar todas as variáveis:**
   - Vá em **Deployments**
   - Clique nos **três pontos** do último deploy
   - Selecione **"Redeploy"**
   - Aguarde o deploy terminar

---

### **Passo 6: Testar novamente**

1. Acesse a aplicação
2. Tente fazer upload de uma imagem
3. Se ainda der erro, verifique o console do navegador (F12) para ver o erro completo

---

## 🔍 Verificar se está correto:

Execute no console do navegador (F12):

```javascript
fetch('/api/upload/test', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
})
.then(r => r.json())
.then(console.log)
```

**Resultado esperado:**
```json
{
  "config": {
    "uploadMode": "cloudinary",
    "hasCloudName": true,
    "hasApiKey": true,
    "hasApiSecret": true,
    "cloudNameLength": 9,  // "dtzkrgphn" tem 9 caracteres
    "apiKeyLength": 15,    // "371925975321998" tem 15 caracteres
    "apiSecretLength": 40  // O API Secret geralmente tem 40 caracteres
  },
  "cloudinaryStatus": "configured",
  "message": "Cloudinary configurado corretamente"
}
```

---

## ⚠️ IMPORTANTE:

- **NÃO** crie uma nova chave de API se você já tem uma funcionando
- O problema é provavelmente com o **valor das variáveis de ambiente na Vercel**
- Certifique-se de que **não há espaços ou aspas** nos valores
- Após atualizar as variáveis, **sempre faça um redeploy**
