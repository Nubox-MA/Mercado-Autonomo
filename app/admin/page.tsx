'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import axios from 'axios'
import { Package, Eye, AlertTriangle } from 'lucide-react'

interface Stats {
  totalProducts: number
  availableProducts: number
  unavailableProducts: number
  totalCategories: number
  mostViewedProducts: Array<{
    id: string
    name: string
    views: number
  }>
}

export default function AdminDashboard() {
  const { token } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('all')

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
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
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

        <div className="card bg-gradient-to-br from-red-500 to-red-600 text-white border-0 shadow-red-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-xs sm:text-sm font-bold uppercase tracking-wider">Produtos Indisponíveis</p>
              <p className="text-3xl sm:text-4xl font-black mt-1">{stats.unavailableProducts}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-2xl">
              <AlertTriangle size={32} />
            </div>
          </div>
        </div>

      </div>

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

