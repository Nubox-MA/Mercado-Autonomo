# Como Funciona a Integração com Sistema Saurus PDV

## 📋 Visão Geral

O sistema Saurus PDV é onde os produtos são cadastrados e vendidos fisicamente. Quando um cliente compra no mercado físico, o estoque precisa ser atualizado automaticamente no NüBox para que os clientes online vejam a disponibilidade correta.

---

## 🔄 Fluxo Completo

### 1. **Situação Inicial**
```
Sistema Saurus PDV:
- Produto "Coca-Cola 2L" 
- Código: 12345
- Estoque: 10 unidades

NüBox:
- Produto "Coca-Cola 2L" (ID: abc-123)
- Estoque: 10 unidades
- Mapeado: externalId = "12345"
```

### 2. **Cliente Compra no PDV Físico**
```
Cliente vai ao mercado físico
↓
Escaneia código de barras "Coca-Cola 2L"
↓
Sistema Saurus debita 1 unidade
↓
Estoque no Saurus: 10 → 9 unidades
```

### 3. **Sistema Saurus Notifica NüBox**
```
Sistema Saurus faz chamada HTTP:
POST https://acessenubox.vercel.app/api/integration/saurus/webhook

Body:
{
  "productCode": "12345",
  "quantity": 1,
  "newStock": 9
}
```

### 4. **NüBox Atualiza Estoque**
```
NüBox recebe notificação
↓
Busca produto com externalId = "12345"
↓
Atualiza estoque: 10 → 9
↓
Se estoque = 0, marca produto como inactive
```

### 5. **Cliente Online Vê Atualização**
```
Cliente acessa NüBox
↓
Vê "Coca-Cola 2L" com 9 unidades disponíveis
↓
Ou vê "Indisponível" se estoque = 0
```

---

## 🛠️ Como Configurar (Passo a Passo)

### **Passo 1: Executar Migration no Banco**
```bash
npx prisma db push
```
Isso adiciona os campos `externalId` e `externalSystem` nas tabelas de produtos e condomínios.

### **Passo 2: Configurar Variável de Ambiente**
No Vercel (ou .env local):
```env
SAURUS_WEBHOOK_SECRET=chave_secreta_aleatoria_aqui
```
Esta chave será usada para validar que as notificações realmente vêm do sistema Saurus.

### **Passo 3: Mapear Produtos**
Para cada produto no NüBox, você precisa mapear com o código do sistema Saurus:

**Opção A: Via API (manual)**
```bash
POST /api/integration/saurus/map-product
{
  "productId": "abc-123",      // ID do produto no NüBox
  "saurusCode": "12345"        // Código do produto no Saurus
}
```

**Opção B: Via Interface Admin (futuro)**
- Criar tela no admin para mapear produtos
- Selecionar produto NüBox → Digitar código Saurus → Salvar

### **Passo 4: Configurar Sistema Saurus**
Você precisa configurar no sistema Saurus para que ele chame o webhook quando uma venda acontecer:

**URL do Webhook:**
```
https://acessenubox.vercel.app/api/integration/saurus/webhook
```

**Método:** POST

**Headers:**
```
Authorization: Bearer {SAURUS_WEBHOOK_SECRET}
Content-Type: application/json
```

**Body (exemplo):**
```json
{
  "productCode": "12345",
  "quantity": 1,
  "newStock": 9,
  "timestamp": "2026-02-18T15:30:00Z"
}
```

---

## 📊 Estrutura de Dados

### **Produto no NüBox (antes do mapeamento)**
```json
{
  "id": "abc-123",
  "name": "Coca-Cola 2L",
  "stock": 10,
  "externalId": null,        // ← Ainda não mapeado
  "externalSystem": null     // ← Ainda não mapeado
}
```

### **Produto no NüBox (depois do mapeamento)**
```json
{
  "id": "abc-123",
  "name": "Coca-Cola 2L",
  "stock": 10,
  "externalId": "12345",     // ← Código no sistema Saurus
  "externalSystem": "SAURUS" // ← Identifica o sistema externo
}
```

### **Quando chega notificação do Saurus:**
```json
{
  "productCode": "12345",    // Busca produto com externalId = "12345"
  "quantity": 1,             // Quantidade vendida
  "newStock": 9              // Novo estoque após venda
}
```

### **NüBox atualiza:**
```json
{
  "id": "abc-123",
  "name": "Coca-Cola 2L",
  "stock": 9,                // ← Atualizado
  "active": true,            // ← true se stock > 0
  "externalId": "12345",
  "externalSystem": "SAURUS"
}
```

---

## 🔐 Segurança

### **Validação do Webhook**
O endpoint `/api/integration/saurus/webhook` valida:
1. **Secret Key**: Verifica se o header `Authorization` contém a chave correta
2. **Dados obrigatórios**: Verifica se `productCode` foi enviado
3. **Produto mapeado**: Verifica se o produto existe e está mapeado

### **Se não tiver secret configurado:**
- O webhook ainda funciona, mas sem validação de segurança
- **Recomendado**: Sempre configurar `SAURUS_WEBHOOK_SECRET`

---

## ⚠️ Casos Especiais

### **1. Produto não mapeado**
Se o sistema Saurus enviar notificação para um produto que não está mapeado:
```json
{
  "error": "Produto não encontrado",
  "message": "Produto com código 12345 não está mapeado no sistema"
}
```
**Solução**: Mapear o produto usando `/api/integration/saurus/map-product`

### **2. Estoque zerado**
Quando `newStock = 0`:
- Produto é automaticamente marcado como `active: false`
- Clientes não veem mais o produto no catálogo
- Quando estoque voltar, precisa ser reativado manualmente ou via sincronização

### **3. Múltiplas lojas/condomínios**
Se houver múltiplas lojas no sistema Saurus:
- Cada condomínio no NüBox pode ter `externalId` diferente
- O webhook pode enviar `storeId` para atualizar estoque específico da loja
- Cada `ProductPrice` (preço por condomínio) pode ter estoque diferente

---

## 🔄 Alternativa: Polling (Consulta Periódica)

Se o sistema Saurus **não suportar webhooks**, você pode usar **polling**:

### **Como funciona:**
1. NüBox consulta estoque no sistema Saurus a cada X minutos
2. Compara com estoque atual no banco
3. Atualiza se houver diferença

### **Endpoint:**
```
POST /api/integration/saurus/sync
```

### **Implementação necessária:**
- Chamar Web Service SOAP da Saurus (`retCadastros` ou método de estoque)
- Processar XML retornado
- Comparar e atualizar produtos

**Nota**: Esta funcionalidade ainda precisa ser implementada (estrutura está pronta, falta chamada SOAP).

---

## 📝 Checklist de Implementação

- [ ] Executar migration no banco (`npx prisma db push`)
- [ ] Configurar `SAURUS_WEBHOOK_SECRET` no Vercel
- [ ] Mapear todos os produtos (NüBox → Código Saurus)
- [ ] Configurar sistema Saurus para chamar webhook
- [ ] Testar com uma venda real
- [ ] Verificar se estoque atualiza corretamente
- [ ] (Opcional) Criar interface admin para mapear produtos
- [ ] (Opcional) Implementar sincronização via polling

---

## ❓ Perguntas Frequentes

### **P: O sistema Saurus precisa estar sempre online?**
R: Não. O NüBox funciona independente. Se o webhook falhar, o estoque pode ficar desatualizado até a próxima sincronização.

### **P: E se houver venda no NüBox online?**
R: Atualmente, vendas online não atualizam o sistema Saurus. Isso seria uma integração reversa (NüBox → Saurus), que pode ser implementada depois.

### **P: Posso ter produtos só no NüBox (sem mapear)?**
R: Sim! Produtos sem `externalId` continuam funcionando normalmente, mas não receberão atualizações automáticas do Saurus.

### **P: E se o código do produto mudar no Saurus?**
R: Você precisa atualizar o mapeamento usando `/api/integration/saurus/map-product` novamente.

---

## 🎯 Resumo

1. **Sistema Saurus** = Fonte da verdade para estoque físico
2. **NüBox** = Recebe notificações e atualiza estoque automaticamente
3. **Mapeamento** = Liga produtos NüBox com códigos Saurus
4. **Webhook** = Sistema Saurus notifica NüBox em tempo real
5. **Resultado** = Clientes online veem disponibilidade atualizada

---

**Pronto para implementar quando quiser!** 🚀
