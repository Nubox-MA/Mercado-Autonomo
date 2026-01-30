# 🔍 Como Diagnosticar Erros de Upload

## ✅ O que foi melhorado:

1. **Logs detalhados no console do navegador** - Agora todos os erros aparecem no console do navegador (F12)
2. **Endpoint de teste** - Criado `/api/upload/test` para verificar a configuração do Cloudinary
3. **Mensagens de erro mais detalhadas** - Os erros agora mostram mais informações

---

## 🔧 Como diagnosticar:

### **Passo 1: Verificar configuração do Cloudinary**

1. Faça login como admin na aplicação
2. Abra o console do navegador (F12 → Console)
3. Execute este comando no console:

```javascript
fetch('/api/upload/test', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
})
.then(r => r.json())
.then(console.log)
```

**O que verificar:**
- `cloudinaryStatus` deve ser `"configured"`
- `config.hasCloudName`, `config.hasApiKey`, `config.hasApiSecret` devem ser `true`
- `config.uploadMode` deve ser `"cloudinary"`

---

### **Passo 2: Tentar fazer upload e verificar o console**

1. Abra o console do navegador (F12 → Console)
2. Tente fazer upload de uma imagem
3. **IMPORTANTE:** Olhe o console do navegador (não os logs da Vercel)

**O que procurar no console:**
```javascript
{
  message: "...",
  response: {
    error: "...",
    details: "...",  // ← Esta é a mensagem importante!
    context: {
      cloudinary: true/false,
      uploadMode: "...",
      hasCloudName: true/false,
      ...
    },
    httpCode: 400/401/403/500,  // ← Código HTTP do Cloudinary
    errorName: "..."
  }
}
```

---

### **Passo 3: Verificar variáveis de ambiente na Vercel**

1. Vá em **Vercel → Projeto → Settings → Environment Variables**
2. Verifique se todas estas variáveis estão configuradas:
   - `CLOUDINARY_CLOUD_NAME` (ex: `dtzkrg...`)
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
   - `UPLOAD_MODE` = `cloudinary`

**⚠️ IMPORTANTE:**
- Certifique-se de que as variáveis estão configuradas para **Production** (não apenas Preview/Development)
- Após adicionar/alterar variáveis, faça um **redeploy** (Vercel → Deployments → três pontos → Redeploy)

---

## 🐛 Erros comuns e soluções:

### **Erro: "Cloudinary não configurado corretamente"**
- **Causa:** Variáveis de ambiente não configuradas ou `UPLOAD_MODE` não é `cloudinary`
- **Solução:** Verificar variáveis na Vercel e fazer redeploy

### **Erro: "401 Unauthorized" ou "Invalid API Key"**
- **Causa:** Credenciais do Cloudinary incorretas
- **Solução:** Verificar `CLOUDINARY_API_KEY` e `CLOUDINARY_API_SECRET` na Vercel

### **Erro: "400 Bad Request"**
- **Causa:** Arquivo muito grande ou formato inválido
- **Solução:** Usar imagem JPG/PNG/WEBP com menos de 5MB

### **Erro: "500 Internal Server Error" sem detalhes**
- **Causa:** Erro no Cloudinary que não está sendo capturado
- **Solução:** Verificar o console do navegador (F12) para ver os detalhes completos

---

## 📝 Próximos passos:

1. **Aguardar o deploy** na Vercel (deve iniciar automaticamente)
2. **Testar o endpoint de diagnóstico** (`/api/upload/test`)
3. **Tentar fazer upload** e verificar o **console do navegador** (F12)
4. **Me enviar:**
   - O resultado do `/api/upload/test`
   - O erro completo que aparece no console do navegador quando tenta fazer upload

---

## 💡 Dica:

**Sempre verifique o console do navegador (F12 → Console)** antes de verificar os logs da Vercel. Os logs do navegador mostram os erros completos que o servidor retorna, enquanto os logs da Vercel podem não mostrar todos os detalhes.
