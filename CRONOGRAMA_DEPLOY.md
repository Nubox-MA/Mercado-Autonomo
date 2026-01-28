# 📅 Cronograma de Deploy - Mercado Autônomo

## 🎯 Objetivo
Fazer deploy completo da aplicação no Vercel com:
- ✅ Banco de dados PostgreSQL funcionando
- ✅ Upload de fotos no Cloudinary funcionando
- ✅ Atualizações em tempo real (admin → cliente)
- ✅ Todas as funcionalidades operacionais
- ✅ Dados sempre atualizados quando admin faz mudanças
- ✅ Fotos carregando perfeitamente via CDN

---

## 📋 FASE 1: Preparação do Código (30-45 min)

### ✅ Passo 1.1: Verificar e organizar arquivos
- [ ] Verificar se `.env.local` está no `.gitignore` (já está ✅)
- [ ] Criar `.env.example` manualmente na raiz com:
  ```
  DATABASE_URL="file:./dev.db"
  JWT_SECRET="sua_chave_secreta"
  CLOUDINARY_CLOUD_NAME=""
  CLOUDINARY_API_KEY=""
  CLOUDINARY_API_SECRET=""
  UPLOAD_MODE="local"
  ```
- [ ] Verificar se não há credenciais hardcoded no código
- [ ] Testar build local: `npm run build`

**Tempo estimado:** 10 min

### ✅ Passo 1.2: Preparar repositório GitHub
- [ ] Criar repositório no GitHub (se ainda não tiver)
- [ ] Fazer commit de todos os arquivos
- [ ] Fazer push para o GitHub
- [ ] Verificar se o código está completo no repositório

**Tempo estimado:** 10 min

**Comandos:**
```bash
git init
git add .
git commit -m "Preparação para deploy"
git remote add origin https://github.com/seu-usuario/mercado-autonomo.git
git push -u origin main
```

---

## 📋 FASE 2: Configurar Banco de Dados PostgreSQL (20-30 min)

### ✅ Passo 2.1: Criar conta no Supabase (Recomendado - Gratuito)
- [ ] Acessar: https://supabase.com
- [ ] Criar conta (pode usar GitHub)
- [ ] Criar novo projeto
- [ ] Anotar: Database URL (será usado depois)

**Tempo estimado:** 10 min

### ✅ Passo 2.2: Migrar Schema do Prisma
- [ ] Atualizar `prisma/schema.prisma`:
  ```prisma
  datasource db {
    provider = "postgresql"  // Mudar de "sqlite"
    url      = env("DATABASE_URL")
  }
  ```
- [ ] Instalar dependências: `npm install`
- [ ] Gerar Prisma Client: `npx prisma generate`

**Tempo estimado:** 5 min

### ✅ Passo 2.3: Criar Migration e Aplicar
- [ ] Criar migration: `npx prisma migrate dev --name init_postgresql`
- [ ] Verificar se as tabelas foram criadas no Supabase
- [ ] (Opcional) Executar seed se necessário: `npm run seed`

**Tempo estimado:** 10 min

**⚠️ IMPORTANTE:** Guardar a `DATABASE_URL` do Supabase para usar no Vercel depois!

---

## 📋 FASE 3: Configurar Cloudinary para Fotos (15-20 min)

### ✅ Passo 3.1: Criar conta no Cloudinary
- [ ] Acessar: https://cloudinary.com
- [ ] Criar conta gratuita
- [ ] Acessar Dashboard
- [ ] Anotar as credenciais:
  - Cloud Name
  - API Key
  - API Secret

**Tempo estimado:** 5 min

### ✅ Passo 3.2: Instalar e Configurar Cloudinary no Código
- [ ] Instalar: `npm install cloudinary`
- [ ] ✅ Código já atualizado! O `app/api/upload/route.ts` já suporta Cloudinary
- [ ] Verificar se funciona: o código detecta automaticamente se usar Cloudinary ou local
- [ ] Para produção, configurar `UPLOAD_MODE=cloudinary` no Vercel

**Tempo estimado:** 5 min (código já está pronto!)

**⚠️ IMPORTANTE:** Guardar as credenciais do Cloudinary para usar no Vercel depois!

---

## 📋 FASE 4: Deploy no Vercel (20-30 min)

### ✅ Passo 4.1: Criar conta e conectar GitHub
- [ ] Acessar: https://vercel.com
- [ ] Criar conta (pode usar GitHub)
- [ ] Clicar em "Add New Project"
- [ ] Conectar repositório GitHub
- [ ] Selecionar o repositório `mercado-autonomo`

**Tempo estimado:** 5 min

### ✅ Passo 4.2: Configurar Variáveis de Ambiente
Antes de fazer deploy, configurar TODAS as variáveis:

- [ ] **DATABASE_URL**: `postgresql://...` (do Supabase)
- [ ] **JWT_SECRET**: Gerar com `openssl rand -base64 32` (ou usar gerador online)
- [ ] **CLOUDINARY_CLOUD_NAME**: (do Cloudinary Dashboard)
- [ ] **CLOUDINARY_API_KEY**: (do Cloudinary Dashboard)
- [ ] **CLOUDINARY_API_SECRET**: (do Cloudinary Dashboard)
- [ ] **UPLOAD_MODE**: `cloudinary` (para usar Cloudinary em produção)

**Como configurar:**
1. No Vercel, antes de fazer deploy
2. Ir em "Environment Variables"
3. Adicionar cada variável uma por uma
4. Marcar para "Production", "Preview" e "Development"

**Tempo estimado:** 10 min

### ✅ Passo 4.3: Fazer Deploy
- [ ] Clicar em "Deploy"
- [ ] Aguardar build completar (2-5 min)
- [ ] Verificar se não há erros no log
- [ ] Anotar a URL gerada (ex: `mercado-autonomo.vercel.app`)

**Tempo estimado:** 5-10 min

---

## 📋 FASE 5: Testes e Validação (30-45 min)

### ✅ Passo 5.1: Testar Acesso Básico
- [ ] Acessar a URL do Vercel
- [ ] Verificar se a página carrega
- [ ] Verificar se não há erros no console do navegador

**Tempo estimado:** 5 min

### ✅ Passo 5.2: Testar Login Admin
- [ ] Acessar `/admin/login`
- [ ] Fazer login com credenciais admin
- [ ] Verificar se redireciona para o painel admin
- [ ] Verificar se todas as páginas admin carregam

**Tempo estimado:** 5 min

### ✅ Passo 5.3: Testar Upload de Fotos
- [ ] Ir em "Produtos" → "Novo Produto"
- [ ] Tentar fazer upload de uma foto
- [ ] Verificar se a foto aparece no preview
- [ ] Salvar o produto
- [ ] Verificar se a foto aparece no catálogo público

**Tempo estimado:** 10 min

### ✅ Passo 5.4: Testar CRUD Completo
- [ ] Criar um produto
- [ ] Editar o produto
- [ ] Verificar se aparece no catálogo público
- [ ] Verificar se atualiza em tempo real
- [ ] Deletar um produto
- [ ] Verificar se some do catálogo

**Tempo estimado:** 10 min

### ✅ Passo 5.5: Testar Tempo Real
- [ ] Abrir catálogo público em uma aba
- [ ] Abrir admin em outra aba
- [ ] Criar/editar produto no admin
- [ ] Verificar se atualiza automaticamente no catálogo (refresh da página)
- [ ] Testar com múltiplos dispositivos se possível

**Tempo estimado:** 10 min

---

## 📋 FASE 6: Ajustes Finais (15-30 min)

### ✅ Passo 6.1: Verificar Performance
- [ ] Testar velocidade de carregamento
- [ ] Verificar se imagens carregam rápido (Cloudinary CDN)
- [ ] Verificar se não há erros no console

**Tempo estimado:** 5 min

### ✅ Passo 6.2: Configurar Domínio Personalizado (Opcional)
- [ ] Se tiver domínio próprio, configurar no Vercel
- [ ] Adicionar DNS records
- [ ] Aguardar propagação (pode levar até 24h)

**Tempo estimado:** 10-20 min (configuração) + espera

### ✅ Passo 6.3: Documentar Acesso
- [ ] Anotar URL de produção
- [ ] Anotar credenciais admin (guardar em local seguro)
- [ ] Criar documentação de acesso para equipe

**Tempo estimado:** 5 min

---

## 🔄 GARANTIA DE TEMPO REAL - COMO FUNCIONA

### ✅ Arquitetura que Garante Tempo Real:

1. **Admin faz mudança** → Chama API Route → Atualiza PostgreSQL diretamente
2. **Cliente acessa catálogo** → Next.js busca dados do PostgreSQL (sempre atualizado)
3. **Fotos** → Servidas via Cloudinary CDN (instantâneo, global)
4. **Vercel** → Edge Network distribui conteúdo globalmente

### ✅ Por que funciona em tempo real:

- **Banco Único**: Todos (admin e clientes) usam o mesmo PostgreSQL
- **API Direta**: Modificações vão direto para o banco (sem cache intermediário)
- **Next.js SSR**: Cada requisição busca dados frescos do banco
- **Cloudinary CDN**: Fotos servidas instantaneamente de servidores globais
- **Vercel Edge**: Conteúdo distribuído, mas dados sempre do banco atualizado

### ⚠️ IMPORTANTE - Cache (Raramente acontece):

**Se notar que mudanças não aparecem imediatamente:**
- **Cache do navegador**: Fazer hard refresh (Ctrl+F5 ou Cmd+Shift+R)
- **Vercel ISR**: Next.js pode fazer cache de páginas, mas invalida automaticamente
- **Solução**: Páginas do catálogo usam `revalidate` ou são SSR puro

### ✅ Garantia de Dados Atualizados:

- ✅ **Produtos**: Buscados do banco a cada requisição
- ✅ **Categorias**: Buscadas do banco a cada requisição  
- ✅ **Preços**: Calculados do banco em tempo real
- ✅ **Fotos**: URLs do Cloudinary sempre válidas e rápidas

---

## 📊 RESUMO DO CRONOGRAMA

| Fase | Descrição | Tempo |
|------|-----------|-------|
| **Fase 1** | Preparação do Código | 30-45 min |
| **Fase 2** | Banco PostgreSQL | 20-30 min |
| **Fase 3** | Cloudinary | 15-20 min |
| **Fase 4** | Deploy Vercel | 20-30 min |
| **Fase 5** | Testes | 30-45 min |
| **Fase 6** | Ajustes Finais | 15-30 min |
| **TOTAL** | | **2h 10min - 3h 30min** |

---

## 🚨 CHECKLIST FINAL ANTES DE CONSIDERAR PRONTO

- [ ] ✅ Aplicação acessível pela URL do Vercel
- [ ] ✅ Login admin funcionando
- [ ] ✅ Upload de fotos funcionando (Cloudinary)
- [ ] ✅ Criar produto funcionando
- [ ] ✅ Editar produto funcionando
- [ ] ✅ Deletar produto funcionando
- [ ] ✅ Produtos aparecem no catálogo público
- [ ] ✅ Fotos aparecem corretamente
- [ ] ✅ Mudanças do admin refletem no catálogo
- [ ] ✅ Importação de Excel funcionando
- [ ] ✅ Todas as funcionalidades testadas

---

## 🆘 SE ALGO DER ERRADO

### Problema: Build falha no Vercel
- Verificar logs no Vercel
- Testar build local: `npm run build`
- Verificar se todas as dependências estão no `package.json`

### Problema: Banco de dados não conecta
- Verificar `DATABASE_URL` no Vercel
- Verificar se o banco Supabase está ativo
- Testar conexão manualmente

### Problema: Fotos não aparecem
- Verificar credenciais do Cloudinary no Vercel
- Verificar se upload está funcionando
- Verificar URLs das fotos no banco

### Problema: Mudanças não aparecem
- Fazer hard refresh (Ctrl+F5)
- Verificar se salvou no banco
- Verificar logs do Vercel

---

## 📞 PRÓXIMOS PASSOS

Após completar todas as fases:
1. ✅ Aplicação estará no ar
2. ✅ Admin pode fazer modificações
3. ✅ Clientes verão dados atualizados
4. ✅ Fotos funcionarão perfeitamente
5. ✅ Tudo em tempo real!

---

## ✅ GARANTIAS DE FUNCIONAMENTO

### 🔄 Tempo Real Garantido:
- ✅ **Arquitetura Client-Side**: Páginas buscam dados via API a cada carregamento
- ✅ **API Routes**: Todas as modificações vão direto para PostgreSQL
- ✅ **Sem Cache de Dados**: Cada requisição busca dados frescos do banco
- ✅ **Cloudinary CDN**: Fotos servidas instantaneamente (não depende do servidor)

### 📸 Fotos Funcionando Perfeitamente:
- ✅ **Upload**: Cloudinary recebe e processa instantaneamente
- ✅ **URLs Permanentes**: URLs do Cloudinary nunca expiram
- ✅ **CDN Global**: Fotos carregam rápido em qualquer lugar do mundo
- ✅ **Otimização Automática**: Cloudinary otimiza imagens automaticamente

### 🔐 Dados Sempre Atualizados:
- ✅ **Admin cria produto** → Salva no PostgreSQL → Cliente vê na próxima requisição
- ✅ **Admin edita produto** → Atualiza PostgreSQL → Cliente vê atualizado
- ✅ **Admin deleta produto** → Remove do PostgreSQL → Cliente não vê mais
- ✅ **Importação Excel** → Cria no PostgreSQL → Cliente vê imediatamente

### ⚡ Performance:
- ✅ **Vercel Edge Network**: Conteúdo distribuído globalmente
- ✅ **Cloudinary CDN**: Fotos servidas de servidores próximos ao usuário
- ✅ **PostgreSQL**: Banco rápido e confiável
- ✅ **Next.js**: Framework otimizado para performance

---

## 🎯 RESUMO EXECUTIVO

**O que você terá ao final:**
1. ✅ URL pública acessível (ex: `mercado-autonomo.vercel.app`)
2. ✅ Admin pode fazer todas as modificações normalmente
3. ✅ Clientes sempre veem dados atualizados (tempo real)
4. ✅ Fotos funcionam perfeitamente via Cloudinary
5. ✅ Sistema escalável e profissional

**Tempo total estimado:** 2h 10min - 3h 30min

**Está pronto para começar? Qual fase você quer fazer primeiro?**
