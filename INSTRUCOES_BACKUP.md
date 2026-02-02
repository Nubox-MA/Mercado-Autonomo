# 🔧 Como Criar a Tabela de Backups

## ⚠️ Erro: Tabela de backups não encontrada

Se você está vendo erro 500 ao tentar usar a biblioteca de backups, é porque a tabela `backups` ainda não foi criada no banco de dados.

## ✅ Solução: Execute este SQL no Supabase

### Passo 1: Acessar Supabase
1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. No menu lateral, clique em **SQL Editor**

### Passo 2: Criar Nova Query
1. Clique em **New Query** (ou use o botão "+")
2. Cole o SQL abaixo:

```sql
CREATE TABLE IF NOT EXISTS "backups" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "data" TEXT NOT NULL,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "backups_createdAt_idx" ON "backups"("createdAt");
```

### Passo 3: Executar
1. Clique em **Run** (ou pressione Ctrl+Enter)
2. Aguarde a confirmação de sucesso

### Passo 4: Verificar
Execute esta query para verificar se a tabela foi criada:

```sql
SELECT * FROM "backups" LIMIT 1;
```

Se não der erro, a tabela foi criada com sucesso! ✅

---

## 📝 Arquivo SQL

O arquivo `CRIAR_TABELA_BACKUPS.sql` na raiz do projeto contém o mesmo SQL acima.

---

## 🔄 Após criar a tabela

1. Recarregue a página `/admin/backup`
2. A biblioteca de backups deve funcionar normalmente
3. Você poderá adicionar e listar backups
