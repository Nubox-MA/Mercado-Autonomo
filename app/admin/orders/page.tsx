'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import axios from 'axios'
import { 
  CheckCircle, 
  Search, 
  ShoppingBag, 
  MapPin, 
  Phone, 
  CreditCard, 
  MessageSquare, 
  XCircle, 
  Eye, 
  Calendar,
  ChevronRight,
  X,
  User,
  Trash2,
  MessageCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import ConfirmModal from '@/components/ConfirmModal'

interface OrderItem {
  id: string
  name: string
  price: number
  quantity: number
}

interface Order {
  id: string
  userId: string
  total: number
  observations: string | null
  items: OrderItem[]
  paymentMethod: string | null
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED'
  createdAt: string
  user: {
    name: string
    phone: string | null
    address: string | null
    neighborhood: {
      name: string
      deliveryFee: number
    } | null
  }
}

export default function AdminOrders() {
  const { token } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED' | 'CANCELLED'>('PENDING')
  
  // Modals state
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [orderToFinalize, setOrderToFinalize] = useState<string | null>(null)
  const [orderToCancel, setOrderToCancel] = useState<string | null>(null)
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null)
  const [isActionLoading, setIsActionLoading] = useState(false)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      const response = await axios.get('/api/admin/orders', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setOrders(response.data.orders)
    } catch (error) {
      toast.error('Erro ao carregar pedidos')
    } finally {
      setLoading(false)
    }
  }

  const handleFinalize = async () => {
    if (!orderToFinalize) return

    try {
      setIsActionLoading(true)
      await axios.post(`/api/admin/orders/${orderToFinalize}/finalize`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success('Pedido finalizado e estoque atualizado!')
      setOrderToFinalize(null)
      setSelectedOrder(null)
      fetchOrders()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao finalizar pedido')
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!orderToCancel) return

    try {
      setIsActionLoading(true)
      await axios.post(`/api/admin/orders/${orderToCancel}/cancel`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success('Pedido cancelado com sucesso!')
      setOrderToCancel(null)
      setSelectedOrder(null)
      fetchOrders()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao cancelar pedido')
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!orderToDelete) return

    try {
      setIsActionLoading(true)
      await axios.delete(`/api/admin/orders/${orderToDelete}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success('Pedido excluído permanentemente!')
      setOrderToDelete(null)
      setSelectedOrder(null)
      fetchOrders()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao excluir pedido')
    } finally {
      setIsActionLoading(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price)
  }

  const getStatusBadge = (status: Order['status']) => {
    const styles = {
      PENDING: 'bg-orange-100 text-orange-700',
      COMPLETED: 'bg-green-100 text-green-700',
      CANCELLED: 'bg-red-100 text-red-700'
    }
    const labels = {
      PENDING: 'Pendente',
      COMPLETED: 'Finalizado',
      CANCELLED: 'Cancelado'
    }
    return (
      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${styles[status]}`}>
        {labels[status]}
      </span>
    )
  }

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const getWhatsAppLink = (phone: string | null) => {
    if (!phone) return '#'
    const cleanPhone = phone.replace(/\D/g, '')
    // Se não começar com 55 e tiver 10 ou 11 dígitos, adiciona o 55
    const finalPhone = (cleanPhone.length <= 11 && !cleanPhone.startsWith('55')) ? `55${cleanPhone}` : cleanPhone
    return `https://api.whatsapp.com/send?phone=${finalPhone}`
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 flex items-center gap-3">
          <ShoppingBag className="text-primary-600" />
          Gerenciar Pedidos
        </h1>
        
        <div className="flex bg-gray-100 p-1 rounded-xl w-fit overflow-x-auto max-w-full">
          {[
            { id: 'PENDING', label: 'Pendentes', color: 'text-orange-600' },
            { id: 'COMPLETED', label: 'Finalizados', color: 'text-green-600' },
            { id: 'CANCELLED', label: 'Cancelados', color: 'text-red-600' },
            { id: 'ALL', label: 'Todos', color: 'text-primary-600' }
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setStatusFilter(filter.id as any)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === filter.id ? `bg-white ${filter.color} shadow-sm` : 'text-gray-500'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Buscar por cliente ou ID do pedido..."
          className="input-field pl-12 py-4"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid gap-3">
        {filteredOrders.length === 0 ? (
          <div className="card text-center py-12 text-gray-500">
            Nenhum pedido encontrado.
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div 
              key={order.id} 
              onClick={() => setSelectedOrder(order)}
              className="card p-4 hover:border-primary-500 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {getStatusBadge(order.status)}
                    <span className="text-gray-400 text-[10px] font-bold">#{order.id.slice(0, 8)}</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 truncate group-hover:text-primary-600 transition-colors">
                    {order.user.name}
                  </h3>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 font-medium">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {new Date(order.createdAt).toLocaleDateString('pt-BR')} - {new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <div className="text-right flex items-center gap-4">
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total</p>
                    <p className="text-xl font-black text-primary-600">{formatPrice(order.total)}</p>
                  </div>
                  <ChevronRight size={20} className="text-gray-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 border-b flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-4">
                <div className="bg-primary-100 text-primary-600 p-3 rounded-2xl">
                  <ShoppingBag size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    {getStatusBadge(selectedOrder.status)}
                    <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">#{selectedOrder.id.slice(0, 8)}</span>
                  </div>
                  <h2 className="text-xl font-black text-gray-900">Detalhes do Pedido</h2>
                </div>
              </div>
              <button 
                onClick={() => setSelectedOrder(null)}
                className="p-2 hover:bg-gray-200 rounded-xl transition-colors text-gray-500"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Cliente e Entrega */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                    <User size={12} /> Dados do Cliente
                  </div>
                  <p className="font-bold text-gray-900 text-lg mb-1">{selectedOrder.user.name}</p>
                  <div className="space-y-1.5">
                    <a 
                      href={getWhatsAppLink(selectedOrder.user.phone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-green-600 font-bold hover:underline"
                    >
                      <svg viewBox="0 0 448 512" className="w-4 h-4 fill-[#25D366]" xmlns="http://www.w3.org/2000/svg">
                        <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-93.8-25.7l-6.7-4-69.8 18.3 18.7-68.1-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-5.5-2.8-23.2-8.5-44.2-27.1-16.4-14.6-27.4-32.7-30.6-38.1-3.2-5.5-.3-8.4 2.4-11.2 2.5-2.5 5.5-6.4 8.3-9.6 2.8-3.2 3.7-5.5 5.5-9.3 1.9-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
                      </svg>
                      {selectedOrder.user.phone}
                    </a>
                    <p className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                      <CreditCard size={14} className="text-gray-400" /> {selectedOrder.paymentMethod}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                    <MapPin size={12} /> Endereço de Entrega
                  </div>
                  <p className="font-bold text-gray-900 text-sm leading-tight mb-1">
                    {selectedOrder.user.neighborhood?.name}
                  </p>
                  <p className="text-sm text-gray-600 font-medium leading-relaxed">
                    {selectedOrder.user.address}
                  </p>
                  <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Taxa de Entrega:</span>
                    <span className="text-sm font-black text-primary-600">{formatPrice(selectedOrder.user.neighborhood?.deliveryFee || 0)}</span>
                  </div>
                </div>
              </div>

              {/* Itens do Pedido */}
              <div>
                <div className="flex items-center justify-between mb-3 text-gray-400">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                    <ShoppingBag size={12} /> Itens da Lista
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest">
                    <Calendar size={12} />
                    {new Date(selectedOrder.createdAt).toLocaleDateString('pt-BR')} - {new Date(selectedOrder.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div className="border rounded-2xl overflow-hidden bg-white">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left p-4 font-bold text-gray-500 uppercase text-[10px] tracking-widest">Produto</th>
                        <th className="text-center p-4 font-bold text-gray-500 uppercase text-[10px] tracking-widest">Qtd</th>
                        <th className="text-right p-4 font-bold text-gray-500 uppercase text-[10px] tracking-widest">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedOrder.items.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                          <td className="p-4">
                            <p className="font-bold text-gray-900">{item.name}</p>
                            <p className="text-[10px] text-gray-400 font-medium">{formatPrice(item.price)} un.</p>
                          </td>
                          <td className="p-4 text-center">
                            <span className="bg-gray-100 text-gray-900 px-3 py-1 rounded-lg font-black text-xs">
                              {item.quantity}x
                            </span>
                          </td>
                          <td className="p-4 text-right font-bold text-gray-900">
                            {formatPrice(item.price * item.quantity)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={2} className="p-4 text-right font-bold text-gray-500 uppercase text-[10px] tracking-widest">Total do Pedido</td>
                        <td className="p-4 text-right text-lg font-black text-primary-600">{formatPrice(selectedOrder.total)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                <div className="flex items-center gap-2 text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">
                  <MessageSquare size={12} /> Observações do Cliente
                </div>
                <p className="text-sm font-medium text-blue-800 leading-relaxed italic">
                  {selectedOrder.observations && !selectedOrder.observations.toLowerCase().includes('endereço:') 
                    ? `"${selectedOrder.observations}"` 
                    : 'Sem observações'}
                </p>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-6 border-t bg-gray-50 flex flex-col gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedOrder.status !== 'COMPLETED' && (
                  <button
                    onClick={() => setOrderToFinalize(selectedOrder.id)}
                    className="w-full bg-green-600 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-green-700 transition-all shadow-lg shadow-green-100 active:scale-95"
                  >
                    <CheckCircle size={20} />
                    Finalizar Pedido
                  </button>
                )}
                
                {selectedOrder.status !== 'CANCELLED' && (
                  <button
                    onClick={() => setOrderToCancel(selectedOrder.id)}
                    className={`w-full py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all active:scale-95 ${
                      selectedOrder.status === 'COMPLETED' 
                        ? 'bg-white border-2 border-orange-200 text-orange-600 hover:bg-orange-50' 
                        : 'bg-white border-2 border-red-200 text-red-600 hover:bg-red-50'
                    }`}
                  >
                    <XCircle size={20} />
                    Cancelar Pedido
                  </button>
                )}

                {selectedOrder.status === 'CANCELLED' && (
                  <div className="sm:col-span-1">
                    <div className="w-full bg-red-50 text-red-700 py-4 rounded-2xl font-black flex items-center justify-center gap-2 cursor-default border-2 border-red-100">
                      <XCircle size={20} /> Cancelado
                    </div>
                  </div>
                )}

                {selectedOrder.status === 'COMPLETED' && (
                  <div className="sm:col-span-1">
                    <div className="w-full bg-green-50 text-green-700 py-4 rounded-2xl font-black flex items-center justify-center gap-2 cursor-default border-2 border-green-100">
                      <CheckCircle size={20} /> Concluído
                    </div>
                  </div>
                )}
              </div>

              {/* Opção de Excluir sempre disponível no final */}
              <button
                onClick={() => setOrderToDelete(selectedOrder.id)}
                className="w-full text-gray-400 hover:text-red-500 font-bold text-xs py-2 flex items-center justify-center gap-2 transition-colors"
              >
                <Trash2 size={14} />
                Excluir registro permanentemente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={!!orderToFinalize}
        onClose={() => setOrderToFinalize(null)}
        onConfirm={handleFinalize}
        title="Finalizar Pedido?"
        message={
          orders.find(o => o.id === orderToFinalize)?.status === 'CANCELLED'
            ? "Este pedido está atualmente cancelado. Ao finalizar, os produtos serão debitados do estoque novamente. Deseja continuar?"
            : "Deseja finalizar este pedido? Isso irá debitar automaticamente os produtos do seu estoque."
        }
        confirmText="Sim, Finalizar"
        cancelText="Agora não"
        type="success"
        isLoading={isActionLoading}
      />

       <ConfirmModal
         isOpen={!!orderToCancel}
         onClose={() => setOrderToCancel(null)}
         onConfirm={handleCancel}
         title="Cancelar Pedido?"
         message={
           orders.find(o => o.id === orderToCancel)?.status === 'COMPLETED'
             ? "Este pedido já foi finalizado. Se você cancelar agora, os produtos retornarão automaticamente para o estoque. Deseja continuar?"
             : "Tem certeza que deseja cancelar este pedido? Esta ação não pode ser desfeita."
         }
         confirmText="Sim, Cancelar"
         cancelText="Não cancelar"
         type="danger"
         isLoading={isActionLoading}
       />

       <ConfirmModal
         isOpen={!!orderToDelete}
         onClose={() => setOrderToDelete(null)}
         onConfirm={handleDelete}
         title="Excluir Permanentemente?"
         message="Você está prestes a excluir o registro deste pedido para sempre. Esta ação não pode ser desfeita e o pedido sumirá do histórico. Deseja continuar?"
         confirmText="Sim, Excluir Registro"
         cancelText="Cancelar"
         type="danger"
         isLoading={isActionLoading}
       />
     </div>
   )
 }
