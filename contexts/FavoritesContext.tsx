'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useCondominium } from './CondominiumContext'
import toast from 'react-hot-toast'

interface Product {
  id: string
  name: string
  price: number
  promoPrice?: number
  isPromotion: boolean
  stock: number
  imageUrl?: string
  category?: {
    name: string
  }
}

interface FavoritesContextType {
  favorites: Product[]
  toggleFavorite: (product: Product) => void
  isFavorited: (productId: string) => boolean
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined)

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { selectedCondominium } = useCondominium()
  const [favorites, setFavorites] = useState<Product[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  // Carregar favoritos do armazenamento local por condomínio
  useEffect(() => {
    if (selectedCondominium?.id) {
      const saved = localStorage.getItem(`favorites_${selectedCondominium.id}`)
      if (saved) {
        try {
          setFavorites(JSON.parse(saved))
        } catch (e) {
          console.error('Erro ao carregar favoritos locais', e)
        }
      } else {
        setFavorites([])
      }
    } else {
      setFavorites([])
    }
    setIsLoaded(true)
  }, [selectedCondominium?.id])

  // Salvar favoritos no armazenamento local sempre que mudar
  useEffect(() => {
    if (isLoaded && selectedCondominium?.id) {
      localStorage.setItem(`favorites_${selectedCondominium.id}`, JSON.stringify(favorites))
    }
  }, [favorites, selectedCondominium?.id, isLoaded])

  const toggleFavorite = (product: Product) => {
    if (!selectedCondominium) {
      setTimeout(() => toast.error('Selecione um condomínio primeiro'), 0)
      return
    }

    setFavorites((current) => {
      const exists = current.some((p) => p.id === product.id)
      if (exists) {
        setTimeout(() => toast.success('Removido dos favoritos'), 0)
        return current.filter((p) => p.id !== product.id)
      } else {
        setTimeout(() => toast.success('Adicionado aos favoritos'), 0)
        return [...current, product]
      }
    })
  }

  const isFavorited = (productId: string) => {
    return favorites.some((p) => p.id === productId)
  }

  return (
    <FavoritesContext.Provider value={{ favorites, toggleFavorite, isFavorited }}>
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  const context = useContext(FavoritesContext)
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider')
  }
  return context
}
