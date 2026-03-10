# O Que Pedir ao Cliente para Integração com PDV

## 📋 Informações Essenciais que Você Precisa

### 1. **Tipo de Sistema PDV**
- Qual o nome do sistema que eles usam? (ex: Saurus, TOTVS, Linx, etc.)
- Versão do sistema
- Se é sistema local (instalado no computador) ou na nuvem

### 2. **Acesso à API/Web Service**
Você precisa perguntar:

**"O sistema de vocês tem API ou Web Service disponível para integração?"**

Se SIM, peça:
- **URL do Web Service/API** (endereço para fazer chamadas)
- **Documentação técnica** (manual de integração)
- **Credenciais de acesso**:
  - Usuário/Login
  - Senha ou Token de autenticação
  - Chave de API (se houver)

### 3. **Métodos Disponíveis**
Pergunte quais funcionalidades a API oferece:

✅ **Consultar Produtos**
- Listar todos os produtos cadastrados
- Buscar produto por código de barras
- Obter informações: nome, preço, categoria, etc.

✅ **Consultar Estoque**
- Ver quantidade disponível de cada produto
- Ver histórico de vendas
- Ver produtos vendidos hoje/últimas horas

✅ **Notificações em Tempo Real**
- O sistema pode **notificar** quando uma venda acontece? (Webhook)
- Ou você precisa **consultar periodicamente**? (Polling)

### 4. **Formato dos Dados**
- Como os dados são retornados? (JSON, XML, etc.)
- Qual o formato dos códigos de barras? (EAN-13, código interno, etc.)
- Como são identificados os produtos? (código único, código de barras, etc.)

### 5. **Exemplo de Integração**
Peça um **exemplo prático**:
- Como fazer uma chamada para consultar produtos?
- Como fazer uma chamada para consultar estoque?
- Exemplo de resposta que o sistema retorna

---

## 🎯 O Que Você Vai Fazer com Essas Informações

### **Cenário 1: Sistema com API/Web Service (Ideal)**

Se o sistema deles tiver API, você vai:

1. **Sincronização Inicial** (uma vez):
   - Buscar todos os produtos do PDV
   - Criar/atualizar produtos no NüBox
   - Mapear códigos: código do PDV → ID do produto no NüBox

2. **Atualização em Tempo Real**:
   - **Opção A (Webhook)**: Sistema PDV notifica NüBox quando vende
   - **Opção B (Polling)**: NüBox consulta estoque a cada X minutos

3. **Atualização Automática**:
   - Quando estoque = 0 no PDV → Produto fica `active: false` no NüBox
   - Quando produto é vendido → Estoque atualiza automaticamente

### **Cenário 2: Sistema SEM API (Mais Complexo)**

Se o sistema deles **não tiver API**, você precisa:

1. **Acesso ao Banco de Dados Direto**:
   - Tipo de banco (MySQL, PostgreSQL, SQL Server, etc.)
   - Endereço do servidor
   - Credenciais de acesso
   - Nome do banco de dados
   - Estrutura das tabelas (quais tabelas têm produtos, estoque, vendas)

2. **Ou Exportação Automática**:
   - Sistema exporta arquivo (CSV, Excel, JSON) periodicamente
   - NüBox lê esse arquivo e atualiza

---

## 📝 Perguntas Específicas para Fazer ao Cliente

### **Pergunta 1: Sistema**
> "Qual sistema de PDV vocês usam? Tem API ou Web Service disponível?"

### **Pergunta 2: Documentação**
> "Vocês têm documentação técnica da API? Manual de integração?"

### **Pergunta 3: Credenciais**
> "Preciso de credenciais de acesso (usuário, senha, token) para usar a API. Vocês podem fornecer?"

### **Pergunta 4: Funcionalidades**
> "A API permite consultar produtos e estoque? Pode notificar quando uma venda acontece?"

### **Pergunta 5: Exemplo**
> "Vocês podem me dar um exemplo de como fazer uma chamada na API? Tipo, como consultar os produtos?"

### **Pergunta 6: Banco de Dados (se não tiver API)**
> "Se não tiver API, vocês podem me dar acesso ao banco de dados? Ou exportar os dados periodicamente?"

---

## 🔧 O Que Você Precisa Implementar (Depois de Receber as Informações)

### **1. Endpoint de Sincronização**
```
POST /api/integration/pdv/sync
```
- Busca produtos do PDV
- Atualiza no NüBox

### **2. Endpoint de Webhook (se tiver)**
```
POST /api/integration/pdv/webhook
```
- Recebe notificação quando produto é vendido
- Atualiza estoque automaticamente

### **3. Mapeamento de Produtos**
- Criar tabela para mapear: `codigoPDV → produtoNüBox`
- Ou usar campo `externalId` que já existe no schema

### **4. Atualização Automática de Estoque**
- Quando estoque = 0 → `Product.active = false`
- Quando estoque > 0 → `Product.active = true`

---

## 📊 Exemplo de Fluxo Completo

### **Situação Inicial:**
```
PDV: Coca-Cola 2L - Código: 7891234567890 - Estoque: 10
NüBox: Coca-Cola 2L - Estoque: 10 - Ativo: true
```

### **Cliente Compra no PDV:**
```
PDV: Vende 1 unidade → Estoque: 9
```

### **Sistema Notifica NüBox (via Webhook ou Polling):**
```
NüBox: Atualiza → Estoque: 9 - Ativo: true
```

### **Última Unidade Vendida:**
```
PDV: Vende última unidade → Estoque: 0
NüBox: Atualiza → Estoque: 0 - Ativo: false (indisponível)
```

### **Cliente Online:**
```
Cliente acessa NüBox → Não vê "Coca-Cola 2L" (porque active = false)
```

---

## ⚠️ Pontos Importantes

### **1. Segurança**
- Credenciais devem ser guardadas como **variáveis de ambiente**
- Nunca commitar senhas no código
- Usar HTTPS para todas as comunicações

### **2. Performance**
- Se usar polling, não consultar muito frequentemente (ex: a cada 5-10 minutos)
- Se usar webhook, validar origem das requisições

### **3. Tratamento de Erros**
- O que fazer se a API do PDV estiver offline?
- Como lidar com produtos que não existem mais no PDV?
- Como sincronizar se houver divergência?

### **4. Testes**
- Testar em ambiente de desenvolvimento primeiro
- Validar com poucos produtos antes de sincronizar tudo
- Confirmar que estoque atualiza corretamente

---

## 🎯 Resumo: O Que Pedir

1. ✅ **Nome e versão do sistema PDV**
2. ✅ **URL da API/Web Service** (se tiver)
3. ✅ **Credenciais de acesso** (usuário, senha, token)
4. ✅ **Documentação técnica** (manual de integração)
5. ✅ **Exemplo de chamada** (como consultar produtos/estoque)
6. ✅ **Formato dos dados** (JSON, XML, etc.)
7. ✅ **Webhook disponível?** (notificações em tempo real)
8. ✅ **Ou acesso ao banco de dados?** (se não tiver API)

---

**Com essas informações, você consegue implementar a integração completa!** 🚀
