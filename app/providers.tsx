'use client'

import { AuthProvider } from '@/contexts/AuthContext'
import { CartProvider } from '@/contexts/CartContext'
import { FavoritesProvider } from '@/contexts/FavoritesContext'
import { CondominiumProvider } from '@/contexts/CondominiumContext'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CondominiumProvider>
      <AuthProvider>
        <FavoritesProvider>
          <CartProvider>{children}</CartProvider>
        </FavoritesProvider>
      </AuthProvider>
    </CondominiumProvider>
  )
}

