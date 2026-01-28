# 📸 Guia Rápido - Criar Conta no Cloudinary

## Passo a Passo:

1. **Acesse:** https://cloudinary.com
2. **Clique em:** "Sign Up for Free" ou "Start Free"
3. **Crie conta:** Pode usar Google, GitHub ou email
4. **Preencha o formulário:**
   - Nome completo
   - Email
   - Senha
   - Aceite os termos
   - Clique em "Create Account"
5. **Acesse o Dashboard:**
   - Após criar a conta, você será redirecionado para o Dashboard
6. **Obter credenciais:**
   - No Dashboard, você verá suas credenciais na parte superior
   - Ou vá em **Settings** (ícone de engrenagem) → **Security**
   - Anote:
     - **Cloud Name** (ex: `dxxxxx`)
     - **API Key** (ex: `123456789012345`)
     - **API Secret** (ex: `abcdefghijklmnopqrstuvwxyz123456`)
   
   ⚠️ **IMPORTANTE:** A API Secret só aparece uma vez! Anote bem!

## 📋 O que você terá:
- **25GB de storage gratuito**
- **25GB de bandwidth/mês gratuito**
- **CDN global** (fotos carregam rápido em qualquer lugar)
- **Otimização automática** de imagens

## ✅ Próximo Passo:
Depois de ter as credenciais, me informe e eu ajudo a configurar no Vercel!

---

## 💡 Dica:
Você pode testar o upload localmente criando um arquivo `.env.local` com:
```
CLOUDINARY_CLOUD_NAME=seu_cloud_name
CLOUDINARY_API_KEY=sua_api_key
CLOUDINARY_API_SECRET=sua_api_secret
UPLOAD_MODE=cloudinary
```

Mas isso só funcionará depois de criar a conta no Cloudinary.
