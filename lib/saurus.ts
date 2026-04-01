import axios from 'axios'
import { XMLParser } from 'fast-xml-parser'
import { gunzipSync, gzipSync } from 'zlib'

export type SaurusService = 'CADASTROS' | 'RETAGUARDA'

export type SaurusConfig = {
  token: string // xSenha
  cadastrosUrl: string
  retaguardaUrl: string
  pdvKey: string // ChaveCaixa usada no xmlIntegracao
  dominio: string // Dominio do cliente (ex: dev08)
  tpSync: string // padrão 1
  dhReferencia: string // formato ISO com timezone
}

export type SaurusNeighborhoodOverrides = {
  saurusPdvKey?: string | null
  saurusDominio?: string | null
}

/**
 * Token e URLs vêm do .env. ChaveCaixa e Dominio podem vir do Local (banco) ou do .env.
 */
export function getSaurusConfig(overrides?: SaurusNeighborhoodOverrides): SaurusConfig {
  const token = process.env.SAURUS_TOKEN
  const tpSync = process.env.SAURUS_TP_SYNC ?? '1'
  const dhReferencia = process.env.SAURUS_DH_REFERENCIA ?? '1968-08-30T00:00:00-03:00'

  const cadastrosUrl =
    process.env.SAURUS_CADASTROS_URL ?? 'https://wscadastros.saurus.net.br/v001/serviceCadastros.asmx'
  const retaguardaUrl =
    process.env.SAURUS_RETAGUARDA_URL ?? 'https://wsretaguarda.saurus.net.br/v001/serviceRetaguarda.asmx'

  const pdvKey = (overrides?.saurusPdvKey?.trim() || process.env.SAURUS_PDV_KEY || '').trim()
  const dominio = (overrides?.saurusDominio?.trim() || process.env.SAURUS_DOMINIO || '').trim()

  if (!token) throw new Error('Missing env SAURUS_TOKEN')
  if (!pdvKey) {
    throw new Error(
      'Chave PDV (ChaveCaixa) ausente: defina no cadastro do local ou SAURUS_PDV_KEY no .env'
    )
  }
  if (!dominio) {
    throw new Error('Domínio Saurus ausente: defina no cadastro do local ou SAURUS_DOMINIO no .env')
  }

  return { token, cadastrosUrl, retaguardaUrl, pdvKey, dominio, tpSync, dhReferencia }
}

export function gzipXmlToBase64(xml: string): string {
  const gz = gzipSync(Buffer.from(xml, 'utf8'))
  return gz.toString('base64')
}

export function xmlToBase64(xml: string): string {
  return Buffer.from(xml, 'utf8').toString('base64')
}

export function base64GzipToXml(base64: string): string {
  const buf = Buffer.from(base64, 'base64')
  const xml = gunzipSync(buf).toString('utf8')
  return xml
}

export function parseXmlLoose<T = any>(xml: string): T {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    removeNSPrefix: true,
    trimValues: true,
  })
  return parser.parse(xml) as T
}

function buildSoapEnvelope(methodName: string, xBytesParametrosBase64: string, token: string) {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
               xmlns:xsd="http://www.w3.org/2001/XMLSchema"
               xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <${methodName} xmlns="http://saurus.net.br/">
      <xBytesParametros>${xBytesParametrosBase64}</xBytesParametros>
      <xSenha>${token}</xSenha>
    </${methodName}>
  </soap:Body>
</soap:Envelope>`
}

export async function callSaurusSoap(opts: {
  service: SaurusService
  method: string
  xmlIntegracao: string
  config?: SaurusConfig
}): Promise<{
  rawSoapResponse: string
  resultBase64?: string
  resultXml?: string
}> {
  const config = opts.config ?? getSaurusConfig()
  const url = opts.service === 'CADASTROS' ? config.cadastrosUrl : config.retaguardaUrl
  async function postSoap(xBytesParametros: string) {
    const soapBody = buildSoapEnvelope(opts.method, xBytesParametros, config.token)
    const { data } = await axios.post(url, soapBody, {
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: `http://saurus.net.br/${opts.method}`,
      },
      timeout: 180_000,
      responseType: 'text',
      validateStatus: () => true,
    })
    return typeof data === 'string' ? data : String(data)
  }

  // 1) Tentativa padrão com gzip+base64 (comum na doc)
  let rawSoapResponse = await postSoap(gzipXmlToBase64(opts.xmlIntegracao))
  let parsed = parseXmlLoose<any>(rawSoapResponse)

  // Extrai texto de retorno para detectar erro de payload
  const body1 =
    parsed?.Envelope?.Body ??
    parsed?.Envelope?.['soap:Body'] ??
    parsed?.['soap:Envelope']?.['soap:Body'] ??
    parsed?.['Envelope']?.['Body']
  const responseNode1 =
    body1?.[`${opts.method}Response`] ??
    body1?.[`${opts.method}Result`] ??
    (body1 && typeof body1 === 'object' ? body1[Object.keys(body1)[0]] : undefined)
  const retText1 = String(responseNode1?.xRetTexto ?? responseNode1?.RetTexto ?? '')
  const retNumero1 = String(responseNode1?.xRetNumero ?? responseNode1?.RetNumero ?? '')

  // 2) Fallback: alguns ambientes esperam base64 direto do XML (sem gzip)
  if (
    retNumero1 === '1' &&
    (retText1.toLowerCase().includes('tipo de arquivo') || retText1.toLowerCase().includes('não informado'))
  ) {
    rawSoapResponse = await postSoap(xmlToBase64(opts.xmlIntegracao))
    parsed = parseXmlLoose<any>(rawSoapResponse)
  }

  // Parse final
  const body =
    parsed?.Envelope?.Body ??
    parsed?.Envelope?.['soap:Body'] ??
    parsed?.['soap:Envelope']?.['soap:Body'] ??
    parsed?.['Envelope']?.['Body']

  const responseNode =
    body?.[`${opts.method}Response`] ??
    body?.[`${opts.method}Result`] ??
    (body && typeof body === 'object' ? body[Object.keys(body)[0]] : undefined)

  const resultBase64: string | undefined =
    responseNode?.[`${opts.method}Result`] ??
    responseNode?.['return'] ??
    responseNode?.['Result'] ??
    (typeof responseNode === 'string' ? responseNode : undefined)

  if (!resultBase64 || typeof resultBase64 !== 'string') {
    return { rawSoapResponse }
  }

  let resultXml: string | undefined
  try {
    resultXml = base64GzipToXml(resultBase64)
  } catch {
    // fallback final: alguns ambientes podem retornar XML em base64 sem gzip
    try {
      resultXml = Buffer.from(resultBase64, 'base64').toString('utf8')
    } catch {
      // mantém undefined
    }
  }

  return { rawSoapResponse, resultBase64, resultXml }
}

export function buildXmlIntegracaoBase(
  config: SaurusConfig,
  opts?: { tpArquivo?: string }
): string {
  // Formato oficial informado pela Saurus para retCadastros:
  // xmlIntegracao + Dominio + TpArquivo + ChaveCaixa + TpSync + DhReferencia
  const tpArquivo = opts?.tpArquivo ?? '50'
  return `<?xml version="1.0" encoding="utf-8"?>
<xmlIntegracao>
  <Dominio>${config.dominio}</Dominio>
  <TpArquivo>${tpArquivo}</TpArquivo>
  <ChaveCaixa>${config.pdvKey}</ChaveCaixa>
  <TpSync>${config.tpSync}</TpSync>
  <DhReferencia>${config.dhReferencia}</DhReferencia>
</xmlIntegracao>`
}

