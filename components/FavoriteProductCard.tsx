'use client'

import Image from 'next/image'
import { ShoppingCart, Heart, X } from 'lucide-react'
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

interface FavoriteProductCardProps {
  product: Product
}

export default function FavoriteProductCard({ product }: FavoriteProductCardProps) {
  const { addItem } = useCart()
  const { toggleFavorite } = useFavorites()
  const [isRemoving, setIsRemoving] = useState(false)

  // Validação básica do produto
  if (!product || !product.id || !product.name) {
    return null
  }

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

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation()
    trackView()
    addItem(product, 1) // Sempre adiciona quantidade 1
  }

  const handleRemoveFavorite = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsRemoving(true)
    toggleFavorite(product)
    setTimeout(() => setIsRemoving(false), 300)
  }

  return (
    <div 
      className="card hover:shadow-2xl transition-all duration-500 group flex flex-col h-full border-transparent hover:border-primary-100 border relative cursor-pointer"
      onClick={trackView}
    >
      {/* Favorite Button - sempre vermelho pois está na página de favoritos */}
      <button
        onClick={handleRemoveFavorite}
        className="absolute top-3 right-3 z-20 p-2 rounded-full shadow-lg transition-all active:scale-90 bg-white text-red-500 hover:bg-red-50"
        title="Remover dos favoritos"
      >
        <Heart size={20} fill="currentColor" />
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
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            className="object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="text-4xl mb-2">📦</div>
              <div className="text-xs">Sem imagem</div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col">
        {/* Category */}
        {product.category && (
          <span className="text-xs font-bold text-primary-600 mb-1 uppercase tracking-wider">
            {product.category.name}
          </span>
        )}

        {/* Product Name */}
        <h3 className="font-black text-gray-900 mb-2 line-clamp-2 min-h-[2.5rem]">
          {product.name}
        </h3>

        {/* Price */}
        <div className="mb-4">
          {product.isPromotion && product.promoPrice ? (
            <div>
              <p className="text-sm text-gray-500 line-through">
                {formatPrice(product.price)}
              </p>
              <p className="text-xl font-black text-red-600">
                {formatPrice(product.promoPrice)}
              </p>
            </div>
          ) : (
            <p className="text-xl font-black text-primary-600">
              {formatPrice(product.price)}
            </p>
          )}
        </div>

        {/* Buttons - Layout customizado para favoritos */}
        {isAvailable ? (
          <div className="flex items-center gap-2 mt-auto">
            <button
              onClick={handleAddToCart}
              className="flex-1 flex items-center justify-center gap-2 h-10 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 active:scale-95 transition-all shadow-md shadow-primary-200 text-sm"
            >
              <ShoppingCart size={18} />
              Adicionar
            </button>
            
            <button
              onClick={handleRemoveFavorite}
              disabled={isRemoving}
              className="flex items-center justify-center gap-2 h-10 px-4 bg-red-50 text-red-600 rounded-lg font-bold hover:bg-red-100 active:scale-95 transition-all border border-red-200 text-sm"
              title="Remover dos favoritos"
            >
              <X size={18} />
              <span className="hidden sm:inline">Remover</span>
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
  )
}
