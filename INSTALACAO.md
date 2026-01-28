# 📝 Guia de Instalação - Mercado Autônomo

## 🎯 Passo a Passo Completo

### 1️⃣ Preparação do Ambiente

#### Instalar PostgreSQL

**Windows:**
1. Baixe o PostgreSQL em: https://www.postgresql.org/download/windows/
2. Execute o instalador
3. Durante a instalação:
   - Defina uma senha para o usuário `postgres`
   - Anote a porta (padrão: 5432)
   - Instale o pgAdmin (interface gráfica)

**Verificar instalação:**
```bash
psql --version
```

### 2️⃣ Configurar o Banco de Dados

1. Abra o pgAdmin ou use o terminal
2. Crie o banco de dados:

**Via pgAdmin:**
- Clique com botão direito em "Databases"
- Create > Database
- Nome: `mercado_autonomo`

**Via terminal:**
```bash
psql -U postgres
CREATE DATABASE mercado_autonomo;
\q
```

### 3️⃣ Instalar Dependências do Projeto

Abra o terminal na pasta do projeto:

```bash
npm install
```

Isso instalará todas as dependências do `package.json`.

### 4️⃣ Configurar Variáveis de Ambiente

1. **CRIE** um arquivo `.env` na raiz do projeto (se ainda não existir)

2. **Cole o seguinte conteúdo** (ajuste os valores):

```env
# Database - AJUSTE com suas credenciais
DATABASE_URL="postgresql://postgres:SUA_SENHA_AQUI@localhost:5432/mercado_autonomo?schema=public"

# JWT Secret - Use uma chave aleatória forte
JWT_SECRET="minha_chave_super_secreta_12345_mude_isso"

# Next.js
NEXT_PUBLIC_API_URL="http://localhost:3000"
```

**⚠️ IMPORTANTE:**
- Substitua `SUA_SENHA_AQUI` pela senha do seu PostgreSQL
- Mude o `JWT_SECRET` para uma chave aleatória e forte

### 5️⃣ Configurar o Banco com Prisma

Execute os comandos na ordem:

```bash
# 1. Gerar o cliente Prisma
npx prisma generate

# 2. Criar as tabelas no banco (migration)
npx prisma migrate dev --name init

# 3. Popular o banco com dados de exemplo (seed)
npx prisma db seed
```

**O que isso faz:**
- Cria todas as tabelas necessárias
- Cria usuário admin padrão
- Adiciona 5 categorias
- Adiciona 10 produtos de exemplo

### 6️⃣ Iniciar o Servidor

```bash
npm run dev
```

Aguarde a mensagem:
```
✓ Ready in 3s
○ Local:        http://localhost:3000
```

### 7️⃣ Acessar a Aplicação

Abra no navegador: **http://localhost:3000**

## 🔑 Credenciais de Acesso

### Admin (Gerenciar produtos)
- **CPF**: `00000000000` (11 zeros)
- **Senha**: `admin123`

### Morador (Apenas consultar)
- **CPF**: Qualquer CPF com 11 dígitos (ex: 12345678901)
- **Nome**: Seu nome completo
- O cadastro é automático!

## ✅ Verificar se Tudo Funcionou

1. **Login como Admin**
   - Acesse http://localhost:3000
   - Clique em "Entrar"
   - Selecione "Administrador"
   - CPF: 00000000000
   - Senha: admin123
   - Clique no ícone de engrenagem (⚙️) no topo

2. **Ver Produtos**
   - Você deve ver 10 produtos cadastrados
   - Categorias: Bebidas, Snacks, Doces, Higiene, Limpeza

3. **Testar como Morador**
   - Faça logout
   - Login como "Morador"
   - CPF: 11111111111
   - Nome: João Silva
   - Navegue pelos produtos
   - Adicione à lista de compras

## 🐛 Resolução de Problemas

### Erro: "Can't connect to database"

**Solução:**
1. Verifique se o PostgreSQL está rodando:
   ```bash
   # Windows (Services)
   services.msc
   # Procure por "postgresql" e veja se está "Running"
   ```

2. Verifique as credenciais no `.env`:
   - Usuário correto
   - Senha correta
   - Porta correta (5432)
   - Nome do banco correto

### Erro: "Prisma Client not generated"

**Solução:**
```bash
npx prisma generate
```

### Erro ao fazer seed

**Solução:**
```bash
# Limpar e refazer
npx prisma migrate reset
npx prisma db seed
```

### Porta 3000 já em uso

**Solução:**
```bash
# Use outra porta
npm run dev -- -p 3001
# Acesse: http://localhost:3001
```

### Erro de permissão no upload de imagens

**Solução:**
1. Crie a pasta manualmente:
   ```bash
   mkdir public\uploads
   ```

2. Dê permissões de escrita

## 🔄 Comandos Úteis

```bash
# Ver o banco de dados visualmente
npx prisma studio

# Resetar o banco (CUIDADO: apaga tudo)
npx prisma migrate reset

# Ver logs do Prisma
npx prisma migrate status

# Parar o servidor
Ctrl + C (no terminal)

# Limpar cache do Next.js
rm -rf .next
# ou no Windows:
rmdir /s .next
```

## 📊 Visualizar o Banco de Dados

Execute:
```bash
npx prisma studio
```

Isso abrirá uma interface web em http://localhost:5555 onde você pode:
- Ver todas as tabelas
- Editar dados diretamente
- Adicionar/remover registros

## 🚀 Próximos Passos

1. ✅ Login como admin
2. ✅ Explorar o painel administrativo
3. ✅ Adicionar seus próprios produtos
4. ✅ Upload de fotos dos produtos
5. ✅ Criar categorias personalizadas
6. ✅ Testar como morador
7. ✅ Criar lista de compras

## 💡 Dicas

- **Sempre execute `npm run dev` na pasta do projeto**
- **Mantenha o terminal aberto** enquanto usa a aplicação
- **Use o Prisma Studio** para ver/editar o banco facilmente
- **Backup**: Exporte o banco periodicamente via pgAdmin

## 📞 Checklist de Instalação

- [ ] PostgreSQL instalado e rodando
- [ ] Banco `mercado_autonomo` criado
- [ ] `npm install` executado com sucesso
- [ ] Arquivo `.env` criado e configurado
- [ ] `npx prisma generate` executado
- [ ] `npx prisma migrate dev` executado
- [ ] `npx prisma db seed` executado
- [ ] `npm run dev` rodando sem erros
- [ ] Login como admin funcionando
- [ ] Login como morador funcionando
- [ ] Produtos aparecendo no catálogo

---

🎉 **Pronto! Seu mercado autônomo digital está no ar!**

