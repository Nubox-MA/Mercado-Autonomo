# ⚡ Quick Start - Mercado Autônomo

## 🚀 Instalação Rápida (5 minutos)

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar .env
Crie o arquivo `.env` na raiz:

```env
DATABASE_URL="postgresql://postgres:suasenha@localhost:5432/mercado_autonomo?schema=public"
JWT_SECRET="mude_esta_chave_secreta_123456"
NEXT_PUBLIC_API_URL="http://localhost:3000"
```

### 3. Criar banco PostgreSQL
```sql
CREATE DATABASE mercado_autonomo;
```

### 4. Setup do Prisma
```bash
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
```

### 5. Iniciar aplicação
```bash
npm run dev
```

Acesse: **http://localhost:3000**

---

## 🔑 Logins

**Admin:**
- CPF: `00000000000`
- Senha: `admin123`

**Morador:**
- CPF: Qualquer (ex: `12345678901`)
- Nome: Seu nome

---

## 📁 Estrutura Básica

```
app/
├── api/              → Rotas da API
├── admin/            → Painel Admin
├── login/            → Página de login
├── cart/             → Lista de compras
└── page.tsx          → Catálogo (home)

components/           → Componentes React
contexts/             → Auth & Cart
lib/                  → Utils (auth, prisma)
prisma/               → Schema & Seed
```

---

## 🔧 Comandos Úteis

```bash
# Desenvolvimento
npm run dev

# Build produção
npm run build
npm start

# Prisma
npx prisma studio          # Ver banco visualmente
npx prisma migrate dev     # Criar migration
npx prisma db seed         # Popular dados
npx prisma migrate reset   # Resetar banco

# Ver porta diferente
npm run dev -- -p 3001
```

---

## ✅ Checklist

- [ ] PostgreSQL rodando
- [ ] Banco criado
- [ ] Dependencies instaladas
- [ ] .env configurado
- [ ] Prisma migrate OK
- [ ] Seed executado
- [ ] App rodando
- [ ] Login funciona

---

## 🐛 Problemas Comuns

### Erro de conexão com DB
→ Verifique `.env` e se PostgreSQL está rodando

### Prisma Client não encontrado
```bash
npx prisma generate
```

### Porta 3000 ocupada
```bash
npm run dev -- -p 3001
```

### Resetar tudo
```bash
npx prisma migrate reset
npx prisma db seed
```

---

## 📚 Documentação Completa

- **README.md** → Visão geral completa
- **INSTALACAO.md** → Guia detalhado passo a passo
- **FUNCIONALIDADES.md** → Lista de todas as features

---

## 🎯 Fluxo Básico

### Como Morador
1. Login com CPF e nome
2. Navegar produtos
3. Adicionar à lista
4. Ir ao mercado com lista

### Como Admin
1. Login com CPF e senha
2. Acessar painel (ícone ⚙️)
3. Gerenciar produtos
4. Atualizar estoque

---

**🎉 Pronto para usar!**

