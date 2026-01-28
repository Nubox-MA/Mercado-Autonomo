'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface Condominium {
  id: string
  name: string
  photoUrl?: string
}

interface CondominiumContextType {
  selectedCondominium: Condominium | null
  setSelectedCondominium: (condominium: Condominium | null) => void
  isLoading: boolean
}

const CondominiumContext = createContext<CondominiumContextType | undefined>(undefined)

export function CondominiumProvider({ children }: { children: ReactNode }) {
  const [selectedCondominium, setSelectedCondominiumState] = useState<Condominium | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Carregar condomínio selecionado do localStorage
    const saved = localStorage.getItem('selected-condominium')
    if (saved) {
      try {
        setSelectedCondominiumState(JSON.parse(saved))
      } catch (e) {
        console.error('Erro ao carregar condomínio:', e)
      }
    }
    setIsLoading(false)
  }, [])

  const setSelectedCondominium = (condominium: Condominium | null) => {
    setSelectedCondominiumState(condominium)
    if (condominium) {
      localStorage.setItem('selected-condominium', JSON.stringify(condominium))
    } else {
      localStorage.removeItem('selected-condominium')
    }
  }

  return (
    <CondominiumContext.Provider
      value={{
        selectedCondominium,
        setSelectedCondominium,
        isLoading,
      }}
    >
      {children}
    </CondominiumContext.Provider>
  )
}

export function useCondominium() {
  const context = useContext(CondominiumContext)
  if (context === undefined) {
    throw new Error('useCondominium must be used within a CondominiumProvider')
  }
  return context
}
