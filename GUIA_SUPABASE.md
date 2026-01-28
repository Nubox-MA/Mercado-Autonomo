# 🗄️ Guia Rápido - Criar Banco PostgreSQL no Supabase

## Passo a Passo:

1. **Acesse:** https://supabase.com
2. **Clique em:** "Start your project" ou "Sign Up"
3. **Crie conta:** Pode usar GitHub, Google ou email
4. **Crie novo projeto:**
   - Nome do projeto: `mercado-autonomo` (ou outro nome)
   - Database Password: **ANOTE ESTA SENHA!** (você vai precisar)
   - Region: Escolha a mais próxima (ex: South America - São Paulo)
   - Clique em "Create new project"
5. **Aguarde:** Pode levar 1-2 minutos para criar
6. **Obter Database URL:**
   - Vá em "Settings" (ícone de engrenagem) → "Database"
   - Role até "Connection string"
   - Selecione "URI" ou "Connection pooling"
   - Copie a URL (algo como: `postgresql://postgres.xxxxx:senha@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`)

## ⚠️ IMPORTANTE:
- **ANOTE A SENHA DO BANCO** - você não conseguirá ver ela novamente!
- **ANOTE A DATABASE URL** - precisaremos dela para configurar o Prisma

## Próximo Passo:
Depois de ter a DATABASE URL, me informe e eu configuro o Prisma para usar PostgreSQL!
