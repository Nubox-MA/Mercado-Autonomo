'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type Tab = 'home' | 'favorites' | 'cart' | 'orders'

interface NavigationContextType {
  activeTab: Tab
  setActiveTab: (tab: Tab) => void
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined)

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTabState] = useState<Tab>(() => {
    // Carregar do localStorage se disponível
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('activeTab') as Tab | null
      if (saved && ['home', 'favorites', 'cart', 'orders'].includes(saved)) {
        return saved
      }
    }
    return 'home'
  })

  // Salvar no localStorage sempre que mudar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('activeTab', activeTab)
    }
  }, [activeTab])

  const setActiveTab = (tab: Tab) => {
    setActiveTabState(tab)
  }

  return (
    <NavigationContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </NavigationContext.Provider>
  )
}

export function useNavigation() {
  const context = useContext(NavigationContext)
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider')
  }
  return context
}
