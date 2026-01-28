'use client'

import Image from 'next/image'
import { Plus, Minus, ShoppingCart, Heart } from 'lucide-react'
import { useCart } from '@/contexts/CartContext'
import { useFavorites } from '@/contexts/FavoritesContext'
import { useState } from 'react'
import axios from 'axios'

interface Product {
  id: string
  name: string
  description?: string
  price: number
  promoPrice?: number
  isPromotion: boolean
  isNew: boolean
  stock: number
  active: boolean
  imageUrl?: string
  category?: {
    name: string
  }
}

interface ProductCardProps {
  product: Product
  isFavorited?: boolean
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart()
  const { toggleFavorite, isFavorited } = useFavorites()
  const [quantity, setQuantity] = useState(1)

  const favorited = isFavorited(product.id)

  // Função para registrar visualização no banco
  const trackView = async () => {
    try {
      await axios.get(`/api/products/${product.id}`)
    } catch (error) {
      // Silencioso
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price)
  }

  // Verificar se produto está disponível
  const isAvailable = product.active

  const handleAddToCart = () => {
    trackView() // Contabiliza ao adicionar ao carrinho
    addItem(product, quantity)
    setQuantity(1)
  }

  const handleIncrement = () => {
    if (isAvailable) {
      trackView() // Contabiliza ao aumentar a quantidade
      setQuantity(quantity + 1)
    }
  }

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleFavorite(product)
  }

  return (
    <div 
      className="card hover:shadow-2xl transition-all duration-500 group flex flex-col h-full border-transparent hover:border-primary-100 border relative cursor-pointer"
      onClick={trackView} // Contabiliza ao clicar em qualquer lugar do card
    >
      {/* Favorite Button */}
      <button
        onClick={handleToggleFavorite}
        className="absolute top-3 right-3 z-20 p-2 rounded-full shadow-lg transition-all active:scale-90 bg-white text-gray-400 hover:text-red-500"
      >
        <Heart size={20} fill={favorited ? "currentColor" : "none"} className={favorited ? 'text-red-500' : ''} />
      </button>

      <div className="relative h-48 bg-gray-100 rounded-xl mb-4 overflow-hidden">
        {/* Badges */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
          {product.isNew && (
            <span className="bg-blue-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg uppercase tracking-wider">
              Novidade
            </span>
          )}
          {product.isPromotion && (
            <span className="bg-red-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg uppercase tracking-wider">
              Oferta
            </span>
          )}
          {!isAvailable && (
            <span className="bg-gray-800 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg uppercase tracking-wider">
              Indisponível
            </span>
          )}
        </div>

        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className={`object-cover group-hover:scale-110 transition-transform duration-500 ${
              !isAvailable ? 'opacity-50 grayscale' : ''
            }`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <span className="text-4xl group-hover:scale-110 transition-transform duration-500">
              📦
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col flex-1">
        {product.category && (
          <span className="text-xs text-primary-600 font-semibold uppercase tracking-wider">
            {product.category.name}
          </span>
        )}
        <h3 className="font-bold text-lg mb-1 line-clamp-1">{product.name}</h3>
        {product.description && (
          <p className="text-gray-500 text-sm mb-3 line-clamp-2 h-10">
            {product.description}
          </p>
        )}
        
        <div className="mt-auto space-y-3">
          <div className="flex items-end justify-between">
            <div>
              {product.isPromotion && product.promoPrice ? (
                <>
                  <p className={`text-xs line-through ${!isAvailable ? 'text-gray-400' : 'text-gray-400'}`}>
                    {formatPrice(product.price)}
                  </p>
                  <p className={`text-2xl font-black ${!isAvailable ? 'text-gray-400' : 'text-red-600'}`}>
                    {formatPrice(product.promoPrice)}
                  </p>
                </>
              ) : (
                <p className={`text-2xl font-black ${!isAvailable ? 'text-gray-400' : 'text-primary-600'}`}>
                  {formatPrice(product.price)}
                </p>
              )}
            </div>
          </div>

          {/* Quantity Selector and Add Button - Só mostrar se disponível */}
          {isAvailable ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center border rounded-lg bg-gray-50 h-10">
                <button
                  onClick={(e) => {
                    e.stopPropagation() // Não disparar o clique do card
                    setQuantity(Math.max(1, quantity - 1))
                  }}
                  className="px-2 hover:text-primary-600 transition-colors"
                >
                  <Minus size={16} />
                </button>
                <span className="w-8 text-center font-bold text-sm">
                  {quantity}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation() // Não disparar o clique do card
                    handleIncrement()
                  }}
                  className="px-2 hover:text-primary-600 transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation() // Não disparar o clique do card
                  handleAddToCart()
                }}
                className="flex-1 flex items-center justify-center gap-2 h-10 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 active:scale-95 transition-all shadow-md shadow-primary-200 text-sm"
              >
                <ShoppingCart size={18} />
                Adicionar
              </button>
            </div>
          ) : (
            <button
              disabled
              className="w-full h-10 bg-gray-200 text-gray-400 rounded-lg font-bold cursor-not-allowed text-sm"
            >
              Indisponível no momento
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
