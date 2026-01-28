'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import axios from 'axios'
import toast from 'react-hot-toast'
import { History, ChevronRight, ShoppingBag } from 'lucide-react'
import { useCart } from '@/contexts/CartContext'

export default function OrdersPage() {
  const { user, token, isLoading } = useAuth()
  const { addItem } = useCart()
  const router = useRouter()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Como clientes não precisam mais fazer login, redirecionar para home
    if (!isLoading && !user) {
      router.push('/')
      return
    }
    if (user) {
      fetchOrders()
    }
  }, [user, isLoading])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/orders', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setOrders(response.data.orders)
    } catch (error) {
      toast.error('Erro ao buscar histórico')
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

  const handleRepeatOrder = (orderItems: any[]) => {
    orderItems.forEach(item => {
      addItem(item, item.quantity)
    })
    toast.success('Itens adicionados ao carrinho!')
    router.push('/cart')
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-primary-100 text-primary-600 rounded-2xl">
            <History size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900">Histórico de Listas</h1>
            <p className="text-gray-500">Suas listas salvas anteriormente</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed">
            <div className="text-6xl mb-4">📜</div>
            <h3 className="text-xl font-bold text-gray-800">Nenhuma lista salva</h3>
            <p className="text-gray-500 mb-6 text-sm">Suas listas aparecerão aqui depois que você finalizar uma compra.</p>
            <button
              onClick={() => router.push('/')}
              className="btn-primary"
            >
              Começar Compras
            </button>
          </div>
        ) : (
          <div className="space-y-4 max-w-4xl mx-auto">
            {orders.map((order: any) => (
              <div key={order.id} className="card hover:shadow-lg transition-all group overflow-hidden border border-transparent hover:border-primary-100">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        {new Date(order.createdAt).toLocaleDateString('pt-BR')} às {new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-black rounded uppercase">
                        {order.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex -space-x-3 overflow-hidden p-1">
                        {order.items.slice(0, 3).map((item: any, idx: number) => (
                          <div key={idx} className="inline-block h-10 w-10 rounded-full ring-2 ring-white bg-gray-100 flex items-center justify-center text-sm border shadow-sm">
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt="" className="h-full w-full object-cover rounded-full" />
                            ) : '📦'}
                          </div>
                        ))}
                        {order.items.length > 3 && (
                          <div className="inline-block h-10 w-10 rounded-full ring-2 ring-white bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600 border shadow-sm">
                            +{order.items.length - 3}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">
                          {order.items.length} {order.items.length === 1 ? 'item' : 'itens'}
                        </p>
                        <p className="text-primary-600 font-black text-lg">
                          {formatPrice(order.total)}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleRepeatOrder(order.items)}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-50 text-gray-700 rounded-xl font-bold hover:bg-primary-600 hover:text-white transition-all active:scale-95"
                  >
                    <ShoppingBag size={18} />
                    Repetir Lista
                  </button>
                </div>
                
                {order.observations && (
                  <div className="mt-4 pt-4 border-t border-dashed">
                    <p className="text-sm text-gray-500 italic">
                      &quot; {order.observations} &quot;
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
