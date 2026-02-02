# 📋 Guia Passo a Passo: Criar Tabela de Backups no Supabase

## ✅ Você está no lugar certo!

Você já está no **Supabase SQL Editor**. Siga estes passos:

### 1️⃣ **Cole o SQL abaixo na área de texto**

Na área branca grande onde está escrito "Hit CTRL+K to generate query or just start typing", **cole este código SQL**:

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

### 2️⃣ **Execute o SQL**

Clique no botão verde **"Run CTRL + ↵"** (ou pressione `Ctrl + Enter`)

### 3️⃣ **Verifique o resultado**

Você deve ver uma mensagem de sucesso na aba "Results" abaixo, algo como:
- ✅ "Success. No rows returned"
- ✅ Ou uma mensagem confirmando que a tabela foi criada

### 4️⃣ **Volte para a aplicação**

1. Volte para a página `/admin/backup` no seu navegador
2. Clique no botão **"✅ Já executei o SQL - Tentar Novamente"**
3. O erro 500 deve desaparecer! 🎉

---

## 🔍 **Como verificar se funcionou?**

Execute esta query no Supabase SQL Editor para verificar:

```sql
SELECT * FROM "backups" LIMIT 1;
```

Se não der erro, a tabela foi criada com sucesso! ✅

---

## ⚠️ **Se der erro:**

- **Erro "relation already exists"**: A tabela já existe, está tudo certo!
- **Erro de permissão**: Verifique se está usando a role "postgres" (deve estar no dropdown à direita)
- **Outro erro**: Copie a mensagem de erro e me envie

---

**Pronto! Agora é só colar o SQL e clicar em "Run"!** 🚀
