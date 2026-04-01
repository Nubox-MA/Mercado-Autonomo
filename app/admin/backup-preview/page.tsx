'use client'

import { useCallback, useMemo, useState } from 'react'
import { FileJson, Upload, X, AlertCircle } from 'lucide-react'

type BackupCategory = {
  id: string
  name: string
  description?: string | null
}

type BackupProduct = {
  id: string
  name: string
  description?: string | null
  price: number
  promoPrice?: number | null
  isPromotion?: boolean
  isNew?: boolean
  stock?: number
  imageUrl?: string | null
  categoryId?: string | null
  active?: boolean
  externalId?: string | null
  externalSystem?: string | null
}

type ParsedBackup = {
  version?: string
  createdAt?: string
  data?: {
    categories?: BackupCategory[]
    products?: BackupProduct[]
    neighborhoods?: unknown[]
    productPrices?: unknown[]
    settings?: unknown[]
    admins?: unknown[]
  }
  metadata?: {
    categoriesCount?: number
    productsCount?: number
    neighborhoodsCount?: number
    adminsCount?: number
  }
}

function extractPayload(raw: unknown): {
  categories: BackupCategory[]
  products: BackupProduct[]
  version?: string
  createdAt?: string
  metadata?: ParsedBackup['metadata']
} {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Arquivo não é um objeto JSON válido.')
  }
  const b = raw as ParsedBackup
  const data = b.data ?? (raw as { categories?: unknown; products?: unknown })
  const categories = Array.isArray(data.categories) ? (data.categories as BackupCategory[]) : []
  const products = Array.isArray(data.products) ? (data.products as BackupProduct[]) : []
  if (categories.length === 0 && products.length === 0) {
    throw new Error('Não encontrei listas "categories" e "products" no JSON (formato de backup NüBox esperado).')
  }
  return {
    categories,
    products,
    version: b.version,
    createdAt: b.createdAt,
    metadata: b.metadata,
  }
}

function formatPrice(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

export default function BackupPreviewPage() {
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [payload, setPayload] = useState<ReturnType<typeof extractPayload> | null>(null)
  const [productFilter, setProductFilter] = useState('')

  const onFile = useCallback((file: File | null) => {
    setError(null)
    setPayload(null)
    setFileName(null)
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.json')) {
      setError('Selecione um arquivo .json')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const text = String(reader.result ?? '')
        const json = JSON.parse(text)
        const p = extractPayload(json)
        setPayload(p)
        setFileName(file.name)
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Erro ao ler JSON'
        setError(msg)
      }
    }
    reader.onerror = () => setError('Falha ao ler o arquivo.')
    reader.readAsText(file, 'UTF-8')
  }, [])

  const categoryById = useMemo(() => {
    const m = new Map<string, string>()
    if (!payload) return m
    for (const c of payload.categories) {
      m.set(c.id, c.name)
    }
    return m
  }, [payload])

  const filteredProducts = useMemo(() => {
    if (!payload) return []
    const q = productFilter.trim().toLowerCase()
    if (!q) return payload.products
    return payload.products.filter((p) => {
      const cat = p.categoryId ? categoryById.get(p.categoryId) ?? '' : ''
      return (
        p.name.toLowerCase().includes(q) ||
        cat.toLowerCase().includes(q) ||
        (p.externalId && String(p.externalId).toLowerCase().includes(q))
      )
    })
  }, [payload, productFilter, categoryById])

  const clear = () => {
    setFileName(null)
    setPayload(null)
    setError(null)
    setProductFilter('')
  }

  return (
    <div className="space-y-6 max-w-[1200px]">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900">Visualizar backup (JSON)</h1>
        <p className="text-gray-600 mt-2 text-sm sm:text-base">
          Carregue um arquivo exportado pelo <strong>Backup</strong> do NüBox. Tudo é processado{' '}
          <strong>só no seu navegador</strong> — nada é enviado ao servidor nem gravado no banco.
        </p>
      </div>

      <div className="card border-2 border-dashed border-gray-200 bg-gray-50/50">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <label className="btn-primary inline-flex items-center justify-center gap-2 cursor-pointer shrink-0">
            <Upload size={20} />
            Escolher arquivo JSON
            <input
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            />
          </label>
          {fileName && (
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
              <FileJson className="text-primary-600 shrink-0" size={20} />
              <span className="font-semibold truncate max-w-[240px] sm:max-w-md">{fileName}</span>
              <button
                type="button"
                onClick={clear}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-800"
                aria-label="Limpar"
              >
                <X size={18} />
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="flex gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-900">
          <AlertCircle className="shrink-0 mt-0.5" size={22} />
          <div>
            <p className="font-bold">Não foi possível ler o backup</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {payload && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card bg-primary-50 border-primary-100">
              <p className="text-xs font-bold text-primary-800 uppercase tracking-wide">Categorias</p>
              <p className="text-3xl font-black text-primary-900 mt-1">{payload.categories.length}</p>
            </div>
            <div className="card bg-primary-50 border-primary-100">
              <p className="text-xs font-bold text-primary-800 uppercase tracking-wide">Produtos</p>
              <p className="text-3xl font-black text-primary-900 mt-1">{payload.products.length}</p>
            </div>
            {payload.version && (
              <div className="card">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Versão</p>
                <p className="text-lg font-bold text-gray-900 mt-1">{payload.version}</p>
              </div>
            )}
            {payload.createdAt && (
              <div className="card">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Exportado em</p>
                <p className="text-sm font-semibold text-gray-800 mt-1">
                  {new Date(payload.createdAt).toLocaleString('pt-BR')}
                </p>
              </div>
            )}
          </div>

          <div className="card overflow-x-auto">
            <h2 className="text-lg font-black text-gray-900 mb-4">Categorias no backup</h2>
            {payload.categories.length === 0 ? (
              <p className="text-gray-500 text-sm">Nenhuma categoria neste arquivo.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-bold text-gray-400 uppercase">
                    <th className="py-3 pr-4">Nome</th>
                    <th className="py-3 pr-4 hidden md:table-cell">ID</th>
                    <th className="py-3">Descrição</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[...payload.categories]
                    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
                    .map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="py-3 pr-4 font-semibold text-gray-900">{c.name}</td>
                        <td className="py-3 pr-4 font-mono text-xs text-gray-500 hidden md:table-cell">
                          {c.id}
                        </td>
                        <td className="py-3 text-gray-600 max-w-md truncate">
                          {c.description || '—'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card overflow-x-auto">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-4">
              <h2 className="text-lg font-black text-gray-900">Produtos no backup</h2>
              <input
                type="search"
                placeholder="Filtrar por nome, categoria ou código externo…"
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                className="input-field max-w-md w-full py-2"
              />
            </div>
            {filteredProducts.length === 0 ? (
              <p className="text-gray-500 text-sm">Nenhum produto com esse filtro.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-bold text-gray-400 uppercase">
                    <th className="py-3 pr-3">Nome</th>
                    <th className="py-3 pr-3">Categoria</th>
                    <th className="py-3 pr-3">Preço</th>
                    <th className="py-3 pr-3">Ativo</th>
                    <th className="py-3 hidden lg:table-cell">Externo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[...filteredProducts]
                    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
                    .map((p) => {
                      const catName = p.categoryId
                        ? categoryById.get(p.categoryId) ?? '(id não listado)'
                        : '—'
                      return (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="py-3 pr-3 font-medium text-gray-900 max-w-[200px] sm:max-w-xs">
                            <span className="line-clamp-2">{p.name}</span>
                          </td>
                          <td className="py-3 pr-3 text-gray-700">{catName}</td>
                          <td className="py-3 pr-3 whitespace-nowrap">{formatPrice(Number(p.price) || 0)}</td>
                          <td className="py-3 pr-3">
                            <span
                              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                p.active !== false
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-200 text-gray-700'
                              }`}
                            >
                              {p.active !== false ? 'Sim' : 'Não'}
                            </span>
                          </td>
                          <td className="py-3 text-xs text-gray-500 font-mono hidden lg:table-cell">
                            {p.externalId
                              ? `${p.externalSystem ?? '?'}:${p.externalId}`
                              : '—'}
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            )}
            {productFilter && (
              <p className="text-xs text-gray-500 mt-3">
                Mostrando {filteredProducts.length} de {payload.products.length} produtos.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
