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
}

interface CartItem extends Product {
  quantity: number
}

interface CartContextType {
  items: CartItem[]
  addItem: (product: Product, quantity?: number) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  total: number
  itemCount: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

// Armazenamento local persistente por condomínio
export function CartProvider({ children }: { children: ReactNode }) {
  const { selectedCondominium } = useCondominium()
  const [items, setItems] = useState<CartItem[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  // Carregar lista do armazenamento local do celular por condomínio
  useEffect(() => {
    if (selectedCondominium?.id) {
      const saved = localStorage.getItem(`cart_${selectedCondominium.id}`)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          // Pode ser um objeto com items e observations, ou apenas um array
          const savedItems = Array.isArray(parsed) ? parsed : (parsed.items || [])
          setItems(savedItems)
        } catch (e) {
          console.error('Erro ao carregar carrinho local', e)
          setItems([])
        }
      } else {
        setItems([])
      }
    } else {
      setItems([])
    }
    setIsLoaded(true)
  }, [selectedCondominium?.id])

  // Salvar lista no armazenamento local do celular sempre que mudar
  useEffect(() => {
    if (isLoaded && selectedCondominium?.id) {
      localStorage.setItem(`cart_${selectedCondominium.id}`, JSON.stringify(items))
    }
  }, [items, selectedCondominium?.id, isLoaded])

  const addItem = (product: Product, quantityToAdd: number = 1) => {
    if (!selectedCondominium) {
      toast.error('Selecione um condomínio primeiro')
      return
    }

    let showToast = false
    let toastMessage = ''

    setItems((current) => {
      const existingItem = current.find((item) => item.id === product.id)

      if (existingItem) {
        showToast = true
        toastMessage = 'Quantidade atualizada'
        return current.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantityToAdd }
            : item
        )
      }

      showToast = true
      toastMessage = 'Produto adicionado à lista'
      return [...current, { ...product, quantity: quantityToAdd }]
    })

    if (showToast) {
      toast.success(toastMessage)
    }
  }

  const removeItem = (productId: string) => {
    setItems((current) => current.filter((item) => item.id !== productId))
    toast.success('Produto removido da lista')
  }

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId)
      return
    }

    // Removido limite de estoque - permite qualquer quantidade
    setItems((current) =>
      current.map((item) => {
        if (item.id === productId) {
          return { ...item, quantity }
        }
        return item
      })
    )
  }

  const clearCart = () => {
    setItems([])
    toast.success('Lista limpa')
  }

  const total = items.reduce((sum, item) => {
    const price = item.isPromotion && item.promoPrice ? item.promoPrice : item.price
    return sum + price * item.quantity
  }, 0)

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        total,
        itemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}

