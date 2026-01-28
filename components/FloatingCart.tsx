'use client'

import { ShoppingCart } from 'lucide-react'
import { useCart } from '@/contexts/CartContext'
import { useRouter, usePathname } from 'next/navigation'

export default function FloatingCart() {
  const { items } = useCart()
  const router = useRouter()
  const pathname = usePathname()

  // Não mostrar se estiver no carrinho, seleção de condomínio ou no admin
  if (pathname === '/cart' || pathname === '/select-condominium' || pathname.startsWith('/admin')) {
    return null
  }

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)

  if (totalItems === 0) return null

  return (
    <button
      onClick={() => router.push('/cart')}
      className="fixed z-50 flex items-center gap-3 bg-primary-600 text-white px-6 py-4 rounded-full shadow-2xl hover:bg-primary-700 hover:scale-110 active:scale-95 transition-all animate-bounce-slow"
      style={{ 
        bottom: 'calc(1.5rem + var(--sab, 0px))',
        right: 'calc(1.5rem + var(--sar, 0px))' 
      }}
    >
      <div className="relative">
        <ShoppingCart size={24} />
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-primary-600">
          {totalItems}
        </span>
      </div>
      <span className="font-bold hidden sm:inline">Ver Lista</span>
    </button>
  )
}
