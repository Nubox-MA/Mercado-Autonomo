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
  clearFavorites: () => void
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
      toast.error('Selecione um condomínio primeiro')
      return
    }

    let showToast = false
    let toastMessage = ''

    setFavorites((current) => {
      const exists = current.some((p) => p.id === product.id)
      if (exists) {
        showToast = true
        toastMessage = 'Removido dos favoritos'
        return current.filter((p) => p.id !== product.id)
      } else {
        showToast = true
        toastMessage = 'Adicionado aos favoritos'
        return [...current, product]
      }
    })

    if (showToast) {
      toast.success(toastMessage)
    }
  }

  const isFavorited = (productId: string) => {
    return favorites.some((p) => p.id === productId)
  }

  const clearFavorites = () => {
    setFavorites([])
    toast.success('Lista de favoritos limpa')
  }

  return (
    <FavoritesContext.Provider value={{ favorites, toggleFavorite, isFavorited, clearFavorites }}>
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
