'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()

  // Clientes não precisam mais fazer login, redirecionar para seleção de condomínio
  // Administradores devem usar /admin/login
  useEffect(() => {
    router.push('/select-condominium')
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
        <p className="mt-4 text-gray-600 font-medium">Redirecionando...</p>
      </div>
    </div>
  )
}
