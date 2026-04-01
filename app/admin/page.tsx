'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import axios from 'axios'
import { Package, Eye, AlertTriangle, TrendingDown, X } from 'lucide-react'
import Link from 'next/link'

interface Stats {
  totalProducts: number
  availableProducts: number
  unavailableProducts: number
  lowStockProductsCount: number
  lowStockThreshold: number
  totalCategories: number
  mostViewedProducts: Array<{
    id: string
    name: string
    views: number
  }>
}

type AdminStockBrief = {
  minStock: number | null
  threshold: number
  hasLowStock: boolean
  lowStockLocations: { neighborhoodName: string; stock: number }[]
  stocksByLocation: { neighborhoodName: string; stock: number }[]
}

interface LowStockProductRow {
  id: string
  name: string
  adminStock?: AdminStockBrief
}

interface InactiveProductRow {
  id: string
  name: string
  active: boolean
  category?: { id: string; name: string }
}

export default function AdminDashboard() {
  const { token } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('all')
  const [lowStockModalOpen, setLowStockModalOpen] = useState(false)
  const [lowStockListLoading, setLowStockListLoading] = useState(false)
  const [lowStockList, setLowStockList] = useState<LowStockProductRow[]>([])
  const [unavailableModalOpen, setUnavailableModalOpen] = useState(false)
  const [unavailableListLoading, setUnavailableListLoading] = useState(false)
  const [unavailableList, setUnavailableList] = useState<InactiveProductRow[]>([])

  useEffect(() => {
    fetchStats()
  }, [period])

  const fetchStats = async () => {
    try {
      const response = await axios.get(`/api/admin/stats?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setStats(response.data.stats)
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const openLowStockModal = useCallback(async () => {
    if (!token) return
    setLowStockModalOpen(true)
    setLowStockListLoading(true)
    setLowStockList([])
    try {
      const response = await axios.get('/api/admin/products', {
        params: { _t: Date.now() },
        headers: { Authorization: `Bearer ${token}` },
      })
      const rows: LowStockProductRow[] = (response.data.products ?? []).filter(
        (p: LowStockProductRow) => p.adminStock?.hasLowStock
      )
      rows.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }))
      setLowStockList(rows)
    } catch (e) {
      console.error('Error loading low stock products:', e)
      setLowStockList([])
    } finally {
      setLowStockListLoading(false)
    }
  }, [token])

  const openUnavailableModal = useCallback(async () => {
    if (!token) return
    setUnavailableModalOpen(true)
    setUnavailableListLoading(true)
    setUnavailableList([])
    try {
      const response = await axios.get('/api/admin/products', {
        params: { _t: Date.now() },
        headers: { Authorization: `Bearer ${token}` },
      })
      const rows: InactiveProductRow[] = (response.data.products ?? []).filter(
        (p: InactiveProductRow) => p.active === false
      )
      rows.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }))
      setUnavailableList(rows)
    } catch (e) {
      console.error('Error loading inactive products:', e)
      setUnavailableList([])
    } finally {
      setUnavailableListLoading(false)
    }
  }, [token])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price)
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <p className="mt-4 text-gray-600">Carregando dashboard...</p>
      </div>
    )
  }

  if (!stats) {
    return <div>Erro ao carregar dados</div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-black text-gray-900">Painel de Controle</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-xs sm:text-sm font-bold uppercase tracking-wider">Total de Produtos</p>
              <p className="text-3xl sm:text-4xl font-black mt-1">{stats.totalProducts}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-2xl">
              <Package size={32} />
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-green-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-xs sm:text-sm font-bold uppercase tracking-wider">Produtos Disponíveis</p>
              <p className="text-3xl sm:text-4xl font-black mt-1">{stats.availableProducts}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-2xl">
              <Package size={32} />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void openUnavailableModal()}
          className="card bg-gradient-to-br from-red-500 to-red-600 text-white border-0 shadow-red-100 text-left w-full cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-xs sm:text-sm font-bold uppercase tracking-wider">
                Produtos Indisponíveis
              </p>
              <p className="text-3xl sm:text-4xl font-black mt-1">{stats.unavailableProducts}</p>
              <p className="text-red-100/90 text-[10px] sm:text-xs font-semibold mt-2">
                Marcados como não ativos no cadastro · clique para ver
              </p>
            </div>
            <div className="bg-white/20 p-3 rounded-2xl shrink-0">
              <AlertTriangle size={32} />
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => void openLowStockModal()}
          className="card bg-gradient-to-br from-amber-500 to-orange-600 text-white border-0 shadow-amber-100 text-left w-full cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-100 text-xs sm:text-sm font-bold uppercase tracking-wider">
                Baixo estoque
              </p>
              <p className="text-3xl sm:text-4xl font-black mt-1">
                {stats.lowStockProductsCount ?? 0}
              </p>
              <p className="text-amber-100/90 text-[10px] sm:text-xs font-semibold mt-2">
                &lt; {stats.lowStockThreshold ?? 10} un. em algum local · clique para ver
              </p>
            </div>
            <div className="bg-white/20 p-3 rounded-2xl shrink-0">
              <TrendingDown size={32} />
            </div>
          </div>
        </button>
      </div>

      {lowStockModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="low-stock-modal-title"
          onClick={() => setLowStockModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[min(85vh,720px)] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 p-5 border-b border-gray-100">
              <div>
                <h2 id="low-stock-modal-title" className="text-xl font-black text-gray-900">
                  Produtos com estoque baixo
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Em algum local com menos de{' '}
                  <strong>{stats.lowStockThreshold ?? 10}</strong> un. (mesmo limite de Produtos no admin).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLowStockModalOpen(false)}
                className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                aria-label="Fechar"
              >
                <X size={22} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {lowStockListLoading ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                  <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-amber-500 border-t-transparent mb-3" />
                  <p className="font-medium">Carregando lista…</p>
                </div>
              ) : lowStockList.length === 0 ? (
                <p className="text-center text-gray-500 py-12 font-medium">
                  Nenhum produto com estoque baixo nos locais.
                </p>
              ) : (
                <ul className="space-y-3">
                  {lowStockList.map((p) => (
                    <li
                      key={p.id}
                      className="rounded-xl border border-amber-100 bg-amber-50/40 p-4"
                    >
                      <p className="font-bold text-gray-900">{p.name}</p>
                      {p.adminStock?.lowStockLocations && p.adminStock.lowStockLocations.length > 0 && (
                        <ul className="mt-2 text-sm text-gray-700 space-y-1">
                          {p.adminStock.lowStockLocations.map((loc) => (
                            <li key={`${p.id}-${loc.neighborhoodName}`}>
                              <span className="font-semibold">{loc.neighborhoodName}:</span>{' '}
                              <span className="text-amber-900 font-bold">{loc.stock} un.</span>
                              <span className="text-gray-500"> (abaixo do limite)</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {p.adminStock?.minStock !== null && p.adminStock?.minStock !== undefined && (
                        <p className="text-xs text-gray-500 mt-2">
                          Estoque mínimo entre locais: <strong>{p.adminStock.minStock}</strong> un.
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="p-4 border-t border-gray-100 flex flex-wrap gap-3 justify-end">
              <Link
                href="/admin/products"
                className="px-4 py-2 rounded-xl text-sm font-bold bg-primary-600 text-white hover:bg-primary-700"
                onClick={() => setLowStockModalOpen(false)}
              >
                Ir para Produtos
              </Link>
              <button
                type="button"
                onClick={() => setLowStockModalOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-bold border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {unavailableModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="unavailable-modal-title"
          onClick={() => setUnavailableModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[min(85vh,720px)] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 p-5 border-b border-gray-100">
              <div>
                <h2 id="unavailable-modal-title" className="text-xl font-black text-gray-900">
                  Produtos indisponíveis
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Itens com <strong>Disponível para venda</strong> desmarcado no cadastro (não aparecem ativos no
                  catálogo).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUnavailableModalOpen(false)}
                className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                aria-label="Fechar"
              >
                <X size={22} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {unavailableListLoading ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                  <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-red-500 border-t-transparent mb-3" />
                  <p className="font-medium">Carregando lista…</p>
                </div>
              ) : unavailableList.length === 0 ? (
                <p className="text-center text-gray-500 py-12 font-medium">
                  Nenhum produto marcado como indisponível.
                </p>
              ) : (
                <ul className="space-y-3">
                  {unavailableList.map((p) => (
                    <li
                      key={p.id}
                      className="rounded-xl border border-red-100 bg-red-50/40 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="font-bold text-gray-900 pr-2">{p.name}</p>
                        <span className="text-xs font-bold uppercase tracking-wide text-red-800 bg-red-100 px-2.5 py-1 rounded-full shrink-0">
                          Indisponível
                        </span>
                      </div>
                      {p.category?.name && (
                        <p className="text-sm text-gray-600 mt-2">Categoria: {p.category.name}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="p-4 border-t border-gray-100 flex flex-wrap gap-3 justify-end">
              <Link
                href="/admin/products"
                className="px-4 py-2 rounded-xl text-sm font-bold bg-primary-600 text-white hover:bg-primary-700"
                onClick={() => setUnavailableModalOpen(false)}
              >
                Ir para Produtos
              </Link>
              <button
                type="button"
                onClick={() => setUnavailableModalOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-bold border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Most Viewed Products */}
      <div className="card p-0 sm:p-6 overflow-hidden">
        <div className="p-6 sm:p-0 border-b sm:border-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-1 sm:mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-50 text-primary-600 rounded-xl">
                <Eye size={24} />
              </div>
              <h2 className="text-xl font-black text-gray-900">Produtos Mais Vistos</h2>
            </div>

            <div className="flex items-center bg-gray-100 p-1 rounded-2xl w-fit self-end sm:self-auto">
              {[
                { id: 'all', label: 'Tudo' },
                { id: 'today', label: 'Hoje' },
                { id: '7days', label: '7 Dias' },
                { id: '30days', label: '30 Dias' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id)}
                  className={`px-3 sm:px-4 py-2 rounded-xl text-[10px] sm:text-xs font-bold transition-all ${
                    period === p.id 
                      ? 'bg-white text-primary-600 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 sm:bg-transparent">
              <tr className="border-b">
                <th className="text-left py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Produto</th>
                <th className="text-left py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Vistos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stats.mostViewedProducts.length === 0 ? (
                <tr>
                  <td colSpan={2} className="py-12 text-center text-gray-500 font-medium">
                    Nenhum produto na lista no período selecionado
                  </td>
                </tr>
              ) : (
                stats.mostViewedProducts.map((product, index) => (
                  <tr 
                    key={product.id} 
                    className={`hover:bg-gray-50 transition-colors ${
                      index === stats.mostViewedProducts.length - 1 ? 'border-b' : ''
                    }`}
                  >
                    <td className="py-4 px-6">
                      <p className="font-bold text-gray-900 truncate max-w-[150px] sm:max-w-none">{product.name}</p>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700">
                        {product.views}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="h-6 sm:hidden bg-white"></div> {/* Espaçador extra para mobile */}
      </div>
    </div>
  )
}

