# 🚀 Comandos Prontos para Deploy

## 📋 Quando você tiver as credenciais, use estes comandos:

### 1. Configurar Banco PostgreSQL (Supabase)

```bash
# Opção A: Criar arquivo .env.local
# Crie um arquivo .env.local na raiz com:
DATABASE_URL="postgresql://usuario:senha@host:5432/database?schema=public"
JWT_SECRET="sua_chave_secreta_forte_aqui"

# Depois execute:
npx prisma generate
npx prisma migrate dev --name init_postgresql

# Opção B: Passar diretamente no comando (Windows PowerShell)
$env:DATABASE_URL="postgresql://usuario:senha@host:5432/database?schema=public"
npx prisma generate
npx prisma migrate dev --name init_postgresql
```

### 2. Testar Build Local

```bash
npm run build
```

### 3. Preparar para GitHub

```bash
# Se ainda não fez commit:
git add .
git commit -m "Preparação completa para deploy"

# Conectar ao repositório GitHub:
git remote add origin https://github.com/seu-usuario/mercado-autonomo.git
git branch -M main
git push -u origin main
```

### 4. Variáveis de Ambiente para Vercel

Quando for configurar no Vercel, adicione estas variáveis:

```
DATABASE_URL=postgresql://usuario:senha@host:5432/database?schema=public
JWT_SECRET=sua_chave_secreta_forte_aqui
CLOUDINARY_CLOUD_NAME=seu_cloud_name
CLOUDINARY_API_KEY=sua_api_key
CLOUDINARY_API_SECRET=sua_api_secret
UPLOAD_MODE=cloudinary
```

---

## 🔐 Gerar JWT_SECRET Seguro

```bash
# Windows PowerShell:
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# Ou use um gerador online:
# https://generate-secret.vercel.app/32
```

---

## ✅ Checklist Rápido

- [ ] DATABASE_URL do Supabase
- [ ] Credenciais do Cloudinary (Cloud Name, API Key, API Secret)
- [ ] JWT_SECRET gerado
- [ ] Repositório GitHub criado
- [ ] Conta Vercel criada

Depois disso, é só configurar no Vercel e fazer deploy!
