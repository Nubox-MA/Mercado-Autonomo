# 🔧 Configurar Banco PostgreSQL - Próximos Passos

## ✅ O que já foi feito:
- ✅ Schema do Prisma atualizado para PostgreSQL
- ✅ Código preparado para usar PostgreSQL

## 📋 O que você precisa fazer:

### 1. Criar conta no Supabase
- Acesse: https://supabase.com
- Crie uma conta (pode usar GitHub)
- Crie um novo projeto
- **ANOTE A SENHA DO BANCO** (você não conseguirá ver novamente!)
- **ANOTE A DATABASE URL**

### 2. Obter a DATABASE URL
No Supabase:
1. Vá em **Settings** (ícone de engrenagem) → **Database**
2. Role até **Connection string**
3. Selecione **URI** ou **Connection pooling**
4. Copie a URL completa

A URL será algo como:
```
postgresql://postgres.xxxxx:SUA_SENHA@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
```

### 3. Configurar a DATABASE_URL
Depois de ter a URL, você pode:

**Opção A: Criar arquivo `.env.local`** (recomendado para desenvolvimento)
```bash
# Na raiz do projeto, crie .env.local com:
DATABASE_URL="sua_url_do_supabase_aqui"
JWT_SECRET="sua_chave_secreta_aqui"
```

**Opção B: Usar variável de ambiente diretamente**
Quando for fazer a migration, você pode passar a URL diretamente no comando.

### 4. Executar Migration
Depois de configurar a DATABASE_URL, execute:

```bash
# Gerar Prisma Client
npx prisma generate

# Criar e aplicar migration
npx prisma migrate dev --name init_postgresql
```

Isso vai criar todas as tabelas no banco PostgreSQL!

---

## ⚠️ IMPORTANTE:
- **NÃO commite o arquivo `.env.local`** - ele já está no `.gitignore`
- **A senha do banco é sensível** - guarde com segurança
- **A DATABASE_URL será usada no Vercel depois** - anote bem!

---

## 🆘 Precisa de ajuda?
Quando tiver a DATABASE_URL do Supabase, me informe e eu ajudo a configurar e executar a migration!
