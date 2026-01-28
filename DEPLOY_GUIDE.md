# 🚀 Guia de Deploy - Mercado Autônomo

## ⚠️ Problemas Atuais para Deploy

### 1. **Banco de Dados (SQLite)**
- ❌ **Problema**: SQLite não funciona em ambientes serverless (Netlify, Vercel)
- ✅ **Solução**: Migrar para PostgreSQL em nuvem

### 2. **Upload de Fotos (Sistema de Arquivos)**
- ❌ **Problema**: Fotos salvas em `public/uploads/` não persistem em serverless
- ✅ **Solução**: Usar serviço de storage em nuvem (Cloudinary, AWS S3)

### 3. **Netlify vs Vercel**
- ⚠️ **Netlify**: Funciona, mas precisa de configuração extra para Next.js
- ✅ **Vercel**: Recomendado (feito pela equipe do Next.js)

---

## 📋 Opções de Deploy

### Opção 1: Vercel (RECOMENDADO) ⭐

#### Vantagens:
- ✅ Deploy automático do GitHub
- ✅ Otimizado para Next.js
- ✅ Serverless functions incluídas
- ✅ HTTPS automático
- ✅ CDN global

#### Passos:

1. **Preparar o repositório no GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/seu-usuario/mercado-autonomo.git
   git push -u origin main
   ```

2. **Criar banco PostgreSQL**
   - **Supabase** (gratuito): https://supabase.com
   - **Neon** (gratuito): https://neon.tech
   - **Railway** (gratuito): https://railway.app

3. **Configurar Cloudinary para fotos**
   - Criar conta: https://cloudinary.com (plano gratuito disponível)
   - Obter: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

4. **Deploy na Vercel**
   - Acessar: https://vercel.com
   - Conectar repositório GitHub
   - Configurar variáveis de ambiente:
     ```
     DATABASE_URL=postgresql://usuario:senha@host:5432/database
     JWT_SECRET=sua_chave_secreta_forte_aqui
     CLOUDINARY_CLOUD_NAME=seu_cloud_name
     CLOUDINARY_API_KEY=sua_api_key
     CLOUDINARY_API_SECRET=sua_api_secret
     ```
   - Deploy automático!

---

### Opção 2: Netlify

#### Vantagens:
- ✅ Deploy automático do GitHub
- ✅ HTTPS automático
- ⚠️ Precisa de configuração extra para Next.js

#### Passos:

1. **Mesmo processo do GitHub** (passo 1 acima)

2. **Criar `netlify.toml` na raiz do projeto:**
   ```toml
   [build]
     command = "npm run build"
     publish = ".next"
   
   [[plugins]]
     package = "@netlify/plugin-nextjs"
   ```

3. **Instalar plugin do Next.js:**
   ```bash
   npm install --save-dev @netlify/plugin-nextjs
   ```

4. **Configurar banco e storage** (mesmo do Vercel)

5. **Deploy no Netlify:**
   - Acessar: https://netlify.com
   - Conectar repositório
   - Configurar variáveis de ambiente
   - Deploy!

---

## 🔧 Adaptações Necessárias

### 1. Migrar SQLite → PostgreSQL

#### Passo 1: Atualizar `prisma/schema.prisma`
```prisma
datasource db {
  provider = "postgresql"  // Mudar de "sqlite" para "postgresql"
  url      = env("DATABASE_URL")
}
```

#### Passo 2: Criar nova migration
```bash
npx prisma migrate dev --name migrate_to_postgresql
```

#### Passo 3: Atualizar `.env`
```env
DATABASE_URL="postgresql://usuario:senha@host:5432/database?schema=public"
```

---

### 2. Migrar Upload para Cloudinary

#### Passo 1: Instalar Cloudinary
```bash
npm install cloudinary
```

#### Passo 2: Criar `.env.local` (adicionar ao `.gitignore`)
```env
CLOUDINARY_CLOUD_NAME=seu_cloud_name
CLOUDINARY_API_KEY=sua_api_key
CLOUDINARY_API_SECRET=sua_api_secret
```

#### Passo 3: Atualizar `app/api/upload/route.ts`

Substituir o código atual por:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware'
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(req: NextRequest) {
  const auth = await authMiddleware(req)

  if (!auth.authorized) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado' },
        { status: 400 }
      )
    }

    // Validar tipo de arquivo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo inválido. Use JPG, PNG ou WEBP' },
        { status: 400 }
      )
    }

    // Validar tamanho (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. Máximo 5MB' },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Converter para base64
    const base64 = buffer.toString('base64')
    const dataURI = `data:${file.type};base64,${base64}`

    // Upload para Cloudinary
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        dataURI,
        {
          folder: 'mercado-autonomo',
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) reject(error)
          else resolve(result)
        }
      )
    }) as any

    return NextResponse.json({ imageUrl: result.secure_url })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Erro ao fazer upload da imagem' },
      { status: 500 }
    )
  }
}
```

---

## 📝 Checklist de Deploy

### Antes do Deploy:
- [ ] Migrar banco para PostgreSQL
- [ ] Configurar Cloudinary
- [ ] Atualizar código de upload
- [ ] Criar arquivo `.env.example` (sem valores sensíveis)
- [ ] Adicionar `.env.local` ao `.gitignore`
- [ ] Testar build local: `npm run build`

### Durante o Deploy:
- [ ] Criar conta no Vercel/Netlify
- [ ] Conectar repositório GitHub
- [ ] Configurar variáveis de ambiente
- [ ] Executar seed do banco (se necessário)

### Após o Deploy:
- [ ] Testar login admin
- [ ] Testar upload de foto
- [ ] Testar criação de produto
- [ ] Verificar se fotos aparecem corretamente

---

## 💰 Custos Estimados

### Gratuito (Plano Básico):
- ✅ **Vercel**: 100GB bandwidth/mês (suficiente para começar)
- ✅ **Supabase/Neon**: 500MB de banco (suficiente para começar)
- ✅ **Cloudinary**: 25GB storage + 25GB bandwidth/mês (suficiente para começar)

### Se crescer:
- Vercel Pro: $20/mês
- Supabase Pro: $25/mês
- Cloudinary: Pay-as-you-go

---

## 🔐 Segurança

### Variáveis de Ambiente (NUNCA commitar):
```
DATABASE_URL=...
JWT_SECRET=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

### Dicas:
- Use senhas fortes
- Gere JWT_SECRET aleatório: `openssl rand -base64 32`
- Não compartilhe variáveis de ambiente
- Use HTTPS sempre (automático no Vercel/Netlify)

---

## 🆘 Problemas Comuns

### Erro: "Database does not exist"
- Verificar se o banco foi criado
- Verificar DATABASE_URL

### Erro: "Upload failed"
- Verificar credenciais do Cloudinary
- Verificar limites de tamanho

### Erro: "Build failed"
- Verificar logs no Vercel/Netlify
- Testar build local primeiro

---

## 📚 Recursos

- [Vercel Docs](https://vercel.com/docs)
- [Next.js Deploy](https://nextjs.org/docs/deployment)
- [Cloudinary Docs](https://cloudinary.com/documentation)
- [Supabase Docs](https://supabase.com/docs)
