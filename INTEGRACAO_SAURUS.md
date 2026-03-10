# Integração com Sistema Saurus PDV

## Como Funciona

O sistema Saurus PDV é a **fonte da verdade** para estoque. Quando uma venda acontece no PDV físico, o sistema deles notifica o NüBox para atualizar a disponibilidade.

## Fluxo Visual

```
┌─────────────────┐
│  Cliente no PDV │
│  Escaneia produto│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Sistema Saurus   │
│ Debita estoque   │
│ no PDV           │
└────────┬────────┘
         │
         │ (Webhook)
         ▼
┌─────────────────┐
│  NüBox API      │
│  /api/integration│
│  /saurus/webhook │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Atualiza DB     │
│  - Product.stock │
│  - Product.active│
│  - ProductPrice  │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│  Cliente NüBox   │
│  Vê produto      │
│  indisponível    │
└─────────────────┘
```

## Fluxo de Integração

### 1. Sincronização Inicial (Uma vez)
- Importar produtos do sistema Saurus via Web Service `retCadastros`
- Mapear produtos: código Saurus → Produto NüBox
- Sincronizar estoque inicial

### 2. Atualização em Tempo Real (Contínuo)

**Opção A: Webhook (Recomendado)**
- Quando uma venda acontece no PDV, o sistema Saurus chama:
  ```
  POST /api/integration/saurus/webhook
  ```
- Payload esperado:
  ```json
  {
    "productCode": "12345",  // Código do produto no sistema Saurus
    "quantity": 2,           // Quantidade vendida
    "newStock": 5,           // Novo estoque após venda
    "timestamp": "2026-02-18T15:30:00Z"
  }
  ```

**Opção B: Polling (Alternativa)**
- NüBox consulta periodicamente o estoque no sistema Saurus
- Endpoint: `GET /api/integration/saurus/sync`
- Executa a cada X minutos (configurável)

## Estrutura de Dados

### Mapeamento de Produtos
- Cada produto no NüBox precisa ter um `externalId` que corresponde ao código no sistema Saurus
- Campo: `Product.externalId` (código do produto no Saurus)
- Campo: `Product.externalSystem` (sempre "SAURUS")

### Atualização de Estoque
- Quando recebe notificação de venda:
  1. Busca produto pelo `externalId`
  2. Atualiza `Product.stock` e `ProductPrice.stock` (se houver)
  3. Se `stock <= 0`, marca `Product.active = false`

## Configuração Necessária

### Variáveis de Ambiente
```env
SAURUS_WS_URL=http://wsretaguarda.saurus.net.br/v001/serviceRetaguarda.asmx
SAURUS_WS_PASSWORD=senha_criptografada_fornecida_pela_saurus
SAURUS_WEBHOOK_SECRET=chave_secreta_para_validar_webhooks
```

### Mapeamento de Condomínios
- Cada condomínio no NüBox precisa estar mapeado com uma "Loja" no sistema Saurus
- Campo: `Neighborhood.externalId` (ID da loja no Saurus)

## Endpoints Criados

### 1. Webhook (Recebe notificações do PDV)
```
POST /api/integration/saurus/webhook
```
- Público (mas valida com `SAURUS_WEBHOOK_SECRET`)
- Atualiza estoque imediatamente

### 2. Sincronização Manual/Polling
```
POST /api/integration/saurus/sync
```
- Requer autenticação admin
- Sincroniza todos os produtos ou produtos específicos

### 3. Mapear Produto
```
POST /api/integration/saurus/map-product
```
- Admin apenas
- Mapeia um produto NüBox com código Saurus

## Próximos Passos

1. **Obter credenciais da Saurus:**
   - `xSenha` criptografada
   - Confirmar se eles podem enviar webhooks
   - Ou confirmar método de consulta de estoque em tempo real

2. **Configurar no sistema Saurus:**
   - URL do webhook: `https://acessenubox.vercel.app/api/integration/saurus/webhook`
   - Secret key para validação

3. **Fazer sincronização inicial:**
   - Importar produtos via `retCadastros`
   - Mapear códigos Saurus → Produtos NüBox
   - Sincronizar estoque inicial
