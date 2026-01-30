# 🌐 Configurar Domínio Personalizado na Vercel

## 🎯 Objetivo
Configurar um domínio personalizado como `mercado.autonomo.vercel.app` ou seu próprio domínio.

## 📋 Passo a Passo

### Opção 1: Usar subdomínio da Vercel (Gratuito)

1. Na Vercel, vá em **Settings** → **Domains**
2. Clique em **Add Domain**
3. Digite o domínio desejado (ex: `mercado-autonomo.vercel.app`)
4. A Vercel vai gerar automaticamente
5. Aguarde alguns minutos para propagação DNS

### Opção 2: Usar seu próprio domínio

1. Na Vercel, vá em **Settings** → **Domains**
2. Clique em **Add Domain**
3. Digite seu domínio (ex: `mercadoautonomo.com`)
4. Siga as instruções para configurar DNS no seu provedor de domínio
5. Aguarde propagação DNS (pode levar até 24h)

---

## ⚠️ Sobre URL Fixa (Não Mudar ao Navegar)

**Problema:** Você quer que a URL não mude ao navegar (ex: sempre `mercado.autonomo.vercel.app`, nunca `/admin`).

**Limitação do Next.js:**
- O Next.js usa **roteamento baseado em arquivos**
- Cada página tem sua própria rota (ex: `/admin`, `/cart`)
- Isso é necessário para SEO e funcionalidade correta

**Soluções Possíveis:**

### Solução 1: Usar Hash Routing (Não Recomendado)
- URLs ficam: `mercado.autonomo.vercel.app/#/admin`
- Perde SEO
- Não é ideal para Next.js

### Solução 2: Configurar Rewrites (Parcial)
- Pode fazer rewrite de rotas, mas ainda precisa das rotas reais
- Complexo e não resolve completamente

### Solução 3: Aceitar Rotas Normais (Recomendado)
- O Next.js já funciona perfeitamente com rotas
- Se recarregar em `/admin`, funciona normalmente
- É o comportamento padrão e esperado

**Recomendação:** Use as rotas normais do Next.js. Elas funcionam perfeitamente mesmo ao recarregar a página.

---

## 🔧 Se Mesmo Assim Quiser URL Fixa

Se você realmente precisa de URL fixa (SPA puro), seria necessário:
1. Mudar toda a aplicação para usar hash routing
2. Perder benefícios do Next.js (SSR, SEO, etc.)
3. Reimplementar navegação

**Não recomendado** para este projeto.
