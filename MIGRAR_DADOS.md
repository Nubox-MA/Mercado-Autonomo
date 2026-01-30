# 📦 Migrar Dados para Supabase

## 🎯 Objetivo
Popular o banco PostgreSQL no Supabase com os dados iniciais (condomínios, admin, etc.)

## 📋 Passo a Passo

### 1. Configurar DATABASE_URL localmente

Crie um arquivo `.env.local` na raiz do projeto com:

```env
DATABASE_URL="postgresql://postgres.glzrizjoacjlrmkvjpsc:MG_Nubox2026@aws-1-sa-east-1.pooler.supabase.com:5432/postgres"
JWT_SECRET="H2y06yL2H4m4Ap9RmGe/zl5PHHFAHIWluI/GQH/TGjk="
```

### 2. Executar o Seed

No terminal, execute:

```bash
npx prisma generate
npx prisma db seed
```

Isso vai criar:
- ✅ Usuário admin (login: `admin`, senha: `admin123`)
- ✅ Categorias de exemplo
- ✅ Produtos de exemplo
- ✅ **Condomínio 1** e **Condomínio 2**

### 3. Verificar no Supabase

1. Acesse o Supabase: https://supabase.com
2. Vá em **Table Editor**
3. Verifique se aparecem:
   - Tabela `neighborhoods` com "Condomínio 1" e "Condomínio 2"
   - Tabela `users` com o admin
   - Tabela `categories` com categorias
   - Tabela `products` com produtos

---

## ⚠️ Se você tinha dados no banco local (SQLite)

Se você tinha condomínios, produtos ou outros dados no banco local que não estão no Supabase, você precisará:

1. Exportar os dados do SQLite
2. Importar no PostgreSQL

Mas para começar, execute o seed acima que já cria os dados básicos necessários.
