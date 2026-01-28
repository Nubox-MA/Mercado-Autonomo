# ✅ Checklist Final de Deploy

## 📋 Antes do Deploy - Verificações

### ✅ Código
- [x] JWT_SECRET usa variável de ambiente
- [x] Nenhuma credencial hardcoded
- [x] Build funciona localmente
- [x] Schema Prisma configurado para PostgreSQL
- [x] Cloudinary instalado e código preparado
- [x] Git inicializado e commit criado

### ⏳ Credenciais Necessárias (você precisa criar)
- [ ] **Supabase DATABASE_URL** - Criar em: https://supabase.com
- [ ] **Cloudinary Credentials** - Criar em: https://cloudinary.com
  - [ ] Cloud Name
  - [ ] API Key
  - [ ] API Secret
- [ ] **JWT_SECRET** - Gerar com: `openssl rand -base64 32` ou gerador online
- [ ] **Repositório GitHub** - Criar em: https://github.com/new

---

## 🚀 Passos para Deploy (quando tiver credenciais)

### 1. Configurar Banco PostgreSQL
```bash
# Criar .env.local ou passar variável
DATABASE_URL="postgresql://..."

# Executar migration
npx prisma generate
npx prisma migrate dev --name init_postgresql
```

### 2. Conectar ao GitHub
```bash
git remote add origin https://github.com/seu-usuario/mercado-autonomo.git
git branch -M main
git push -u origin main
```

### 3. Deploy no Vercel
1. Acesse: https://vercel.com
2. Conecte repositório GitHub
3. Configure variáveis de ambiente:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
   - `UPLOAD_MODE=cloudinary`
4. Clique em "Deploy"

### 4. Testar
- [ ] Acessar URL do Vercel
- [ ] Testar login admin
- [ ] Testar upload de foto
- [ ] Testar criar produto
- [ ] Verificar se aparece no catálogo

---

## 📝 Arquivos de Referência

- `CRONOGRAMA_DEPLOY.md` - Cronograma completo
- `GUIA_SUPABASE.md` - Como criar Supabase
- `GUIA_CLOUDINARY.md` - Como criar Cloudinary
- `COMANDOS_PRONTOS.md` - Comandos prontos para usar
- `CONFIGURAR_BANCO.md` - Configuração do banco
- `RESUMO_PREPARACAO.md` - Status geral

---

## ✅ Tudo Pronto do Meu Lado!

Quando você tiver as credenciais, é só seguir os passos acima e fazer o deploy!
