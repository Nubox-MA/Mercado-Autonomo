# 🪟 Guia de Instalação - Windows

## ⚠️ PROBLEMA: Login não funciona

**Causa:** Arquivo `.env` não foi criado e banco de dados não foi configurado.

---

## ✅ SOLUÇÃO COMPLETA

### PASSO 1: Criar arquivo .env

1. **Abra o Bloco de Notas** (Notepad)

2. **Cole este conteúdo** (ajuste a senha do PostgreSQL):

```
DATABASE_URL="postgresql://postgres:SUASENHA@localhost:5432/mercado_autonomo?schema=public"
JWT_SECRET="mercado_autonomo_secret_key_2024_muito_segura"
NEXT_PUBLIC_API_URL="http://localhost:3000"
```

**IMPORTANTE:** Substitua `SUASENHA` pela senha que você definiu ao instalar o PostgreSQL!

3. **Salve o arquivo:**
   - Arquivo → Salvar Como
   - Navegue até: `C:\Users\danie\Downloads\MERCADO AUTONOMO`
   - Nome do arquivo: `.env` (COM O PONTO NO INÍCIO)
   - Tipo: **Todos os arquivos (*.*)**
   - Salvar

---

### PASSO 2: Verificar PostgreSQL

1. Abra o **pgAdmin** ou **prompt de comando**

2. **Verifique se PostgreSQL está rodando:**
   - Pressione `Windows + R`
   - Digite: `services.msc`
   - Procure por "postgresql"
   - Status deve ser "Em execução"

3. **Crie o banco de dados:**

**Opção A - Via pgAdmin:**
- Abra pgAdmin
- Clique com botão direito em "Databases"
- Create → Database
- Nome: `mercado_autonomo`
- Salvar

**Opção B - Via SQL:**
- Use o arquivo `CRIAR_BANCO.sql` que foi criado
- Ou execute no psql: `CREATE DATABASE mercado_autonomo;`

---

### PASSO 3: Fechar programas que possam bloquear

1. **Feche o VS Code** (se estiver aberto)
2. **Feche qualquer terminal/PowerShell** aberto
3. **Verifique se não há `npm` rodando** (Ctrl+Alt+Del → Processos)

---

### PASSO 4: Executar instalação

**Use o arquivo de instalação automática:**

1. Dê um duplo clique no arquivo: **`INSTALAR.bat`**

2. O script vai:
   - Limpar instalações anteriores
   - Instalar dependências
   - Configurar Prisma
   - Criar tabelas no banco
   - Popular com dados iniciais

3. Siga as instruções na tela

---

### PASSO 5: Iniciar o servidor

Após a instalação bem-sucedida:

1. Abra o PowerShell na pasta do projeto
2. Execute:
```bash
npm run dev
```

3. Aguarde a mensagem:
```
✓ Ready in X seconds
○ Local: http://localhost:3000
```

4. Abra o navegador em: **http://localhost:3000**

---

## 🔑 CREDENCIAIS

### Admin
- **CPF:** `00000000000` (11 zeros)
- **Senha:** `admin123`

### Morador
- **CPF:** Qualquer CPF (ex: `12345678901`)
- **Nome:** Seu nome completo

---

## 🐛 PROBLEMAS COMUNS

### Erro: "EPERM: operation not permitted"

**Solução:**
1. Feche VS Code e todos os terminais
2. Execute PowerShell como Administrador
3. Execute novamente o INSTALAR.bat

### Erro: "Cannot connect to database"

**Solução:**
1. Verifique se PostgreSQL está rodando
2. Verifique a senha no arquivo `.env`
3. Certifique-se que o banco `mercado_autonomo` foi criado

### Erro: "Prisma Client not generated"

**Solução:**
```bash
npx prisma generate
```

### Login não funciona mesmo após instalação

**Soluções:**

1. **Verificar se o seed foi executado:**
```bash
npx prisma db seed
```

2. **Ver dados no banco:**
```bash
npx prisma studio
```
- Abre em http://localhost:5555
- Verifique se há usuários na tabela "User"
- Deve ter 1 admin com CPF: 00000000000

3. **Resetar tudo e começar de novo:**
```bash
npx prisma migrate reset
npx prisma db seed
```

### Porta 3000 ocupada

```bash
npm run dev -- -p 3001
```
(Acesse: http://localhost:3001)

---

## 📝 CHECKLIST DE VERIFICAÇÃO

Antes de tentar fazer login, certifique-se:

- [ ] Arquivo `.env` criado na raiz do projeto
- [ ] PostgreSQL instalado e rodando
- [ ] Banco `mercado_autonomo` criado
- [ ] `npm install` executado sem erros
- [ ] `npx prisma generate` executado sem erros
- [ ] `npx prisma migrate dev` executado sem erros
- [ ] `npx prisma db seed` executado sem erros
- [ ] `npm run dev` rodando sem erros
- [ ] Navegador aberto em http://localhost:3000
- [ ] Nenhum erro no console do navegador (F12)

---

## 🔍 COMO VERIFICAR SE ESTÁ FUNCIONANDO

### 1. Abrir Prisma Studio
```bash
npx prisma studio
```

Acesse: http://localhost:5555

### 2. Verificar tabela "User"
- Deve ter pelo menos 1 usuário
- CPF: `00000000000`
- Role: `ADMIN`
- Password: (hash criptografado)

### 3. Verificar tabela "Product"
- Deve ter 10 produtos

### 4. Verificar tabela "Category"
- Deve ter 5 categorias

---

## 💡 TESTE RÁPIDO

Após tudo instalado:

1. Acesse: http://localhost:3000
2. Clique em "Entrar"
3. Selecione "Morador"
4. CPF: `12345678901`
5. Nome: `Teste Silva`
6. Deve criar conta e logar automaticamente

Se funcionar, o sistema está OK!

Depois teste como Admin:
- CPF: `00000000000`
- Senha: `admin123`

---

## 📞 AJUDA ADICIONAL

Se continuar com problemas:

1. **Veja o console do terminal** onde rodou `npm run dev`
2. **Veja o console do navegador** (F12 → Console)
3. **Execute Prisma Studio** para ver se há dados
4. **Verifique o arquivo `.env`** se está correto

---

**Boa sorte! 🚀**

