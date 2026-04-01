# Exemplo de `.env.local` (copie e cole)

## Onde colocar

Crie um arquivo chamado **`.env.local`** na **raiz do projeto** (mesma pasta do `package.json`).

No seu caso, o caminho é:

- `C:\Users\danie\Downloads\M.A. - LISTA\.env.local`

## Conteúdo do `.env.local`

> Cole suas chaves reais apenas no `.env.local` (ele já é ignorado pelo Git).

```env
# Banco (Supabase/Postgres)
DATABASE_URL="COLE_AQUI_SUA_DATABASE_URL"

# Integração SAURUS (SOAP)

# Token/chave de integração (vai no xSenha do SOAP)
SAURUS_TOKEN="COLE_AQUI_A_CHAVE_QUE_O_SAURUS_ENVIOU"

# Chave PDV / Chave-caixa (vincula a loja específica)
SAURUS_PDV_KEY="COLE_AQUI_A_CHAVE_PDV_DO_CLIENTE"

# Dominio do cliente no Saurus (exemplo recebido: dev08)
SAURUS_DOMINIO="dev08"

# Sync (normalmente 1) e data de referência no formato da doc
SAURUS_TP_SYNC="1"
SAURUS_DH_REFERENCIA="1968-08-30T00:00:00-03:00"

# (Opcional) sobrescrever endpoints padrão (prod)
SAURUS_CADASTROS_URL="https://wscadastros.saurus.net.br/v001/serviceCadastros.asmx"
SAURUS_RETAGUARDA_URL="https://wsretaguarda.saurus.net.br/v001/serviceRetaguarda.asmx"

# (Opcional) se for usar webhook no futuro
SAURUS_WEBHOOK_SECRET="uma-chave-para-validar-webhook"
```

## Depois de salvar

- Pare o `npm run dev` (Ctrl+C) e rode de novo, para ele ler as novas variáveis.

