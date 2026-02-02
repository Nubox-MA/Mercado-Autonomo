'use client'

import { AuthProvider } from '@/contexts/AuthContext'
import { CartProvider } from '@/contexts/CartContext'
import { FavoritesProvider } from '@/contexts/FavoritesContext'
import { CondominiumProvider } from '@/contexts/CondominiumContext'
import { NavigationProvider } from '@/contexts/NavigationContext'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CondominiumProvider>
      <AuthProvider>
        <NavigationProvider>
          <FavoritesProvider>
            <CartProvider>{children}</CartProvider>
          </FavoritesProvider>
        </NavigationProvider>
      </AuthProvider>
    </CondominiumProvider>
  )
}

