'use client'

import { useCart } from '@/contexts/CartContext'
import { useCondominium } from '@/contexts/CondominiumContext'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Image from 'next/image'
import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react'
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import ConfirmModal from '@/components/ConfirmModal'

export default function CartPage() {
  const { items, removeItem, updateQuantity, clearCart, total } = useCart()
  const { selectedCondominium } = useCondominium()
  const router = useRouter()
  const [showClearModal, setShowClearModal] = useState(false)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price)
  }

  const getItemPrice = (item: any) => {
    return item.isPromotion && item.promoPrice ? item.promoPrice : item.price
  }

  // Redirecionar apenas no cliente
  useEffect(() => {
    if (!selectedCondominium) {
      router.push('/select-condominium')
    }
  }, [selectedCondominium, router])

  if (!selectedCondominium) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-black text-gray-900 mb-6">Minha Lista de Compras</h1>

        {items.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow-sm border-2 border-dashed">
            <div className="text-6xl mb-4">🛒</div>
            <p className="text-gray-600 text-lg mb-4 font-medium">
              Sua lista está vazia
            </p>
            <button
              onClick={() => router.push('/')}
              className="btn-primary"
            >
              Ver Produtos
            </button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Items List */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => {
                const price = getItemPrice(item)
                return (
                  <div key={item.id} className="bg-white rounded-xl shadow-sm border p-4 flex gap-4">
                    <div className="relative w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          sizes="96px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <ShoppingBag size={32} />
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-1">{item.name}</h3>
                      <div className="flex flex-col">
                        {item.isPromotion && item.promoPrice && (
                          <span className="text-xs text-gray-400 line-through">
                            {formatPrice(item.price)}
                          </span>
                        )}
                        <p className={`font-bold text-lg ${item.isPromotion ? 'text-red-600' : 'text-primary-600'}`}>
                          {formatPrice(price)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end justify-between">
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition"
                        title="Remover"
                      >
                        <Trash2 size={20} />
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition"
                        >
                          <Minus size={18} />
                        </button>
                        <span className="w-12 text-center font-bold text-lg">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition"
                        >
                          <Plus size={18} />
                        </button>
                      </div>

                      <p className="text-lg font-black text-primary-600">
                        {formatPrice(price * item.quantity)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border p-6 sticky top-4 space-y-6">
                <h2 className="text-xl font-black border-b pb-4">Resumo da Lista</h2>

                <div className="space-y-3">
                  <div className="flex justify-between text-gray-600">
                    <span>Quantidade de produtos:</span>
                    <span className="font-bold">{items.length}</span>
                  </div>

                  <div className="flex justify-between text-gray-600">
                    <span>Total de itens:</span>
                    <span className="font-bold">{items.reduce((sum, item) => sum + item.quantity, 0)}</span>
                    </div>
                    
                    <div className="pt-4 border-t">
                      <div className="flex justify-between items-end">
                      <span className="text-gray-900 font-bold text-lg">Total:</span>
                        <div className="text-right">
                          <span className="block text-3xl font-black text-primary-600">
                          {formatPrice(total)}
                          </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <button
                    onClick={() => router.push('/')}
                    className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-200 active:scale-95"
                  >
                    Adicionar Mais Produtos
                  </button>

                  <button
                    onClick={() => setShowClearModal(true)}
                    className="w-full text-red-500 font-medium py-2 hover:bg-red-50 rounded-lg transition-all text-sm border border-red-200"
                  >
                    Limpar toda a lista
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />

      <ConfirmModal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        onConfirm={() => {
          clearCart()
          setShowClearModal(false)
          toast.success('Lista limpa com sucesso!')
        }}
        title="Limpar Lista?"
        message="Tem certeza que deseja remover todos os itens da sua lista? Esta ação não pode ser desfeita."
        confirmText="Sim, Limpar Tudo"
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  )
}
