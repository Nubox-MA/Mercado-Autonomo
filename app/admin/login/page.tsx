'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Lock } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminLoginPage() {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  
  const { login, user, isLoading } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Se já estiver logado como admin, redireciona para o painel
  useEffect(() => {
    if (!isLoading && user && user.role === 'ADMIN') {
      router.push('/admin')
    }
  }, [user, isLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setLoading(true)

    try {
      await login({ cpf: 'admin', password })
      // O redirecionamento será feito pelo useEffect quando o user for atualizado
      router.push('/admin')
    } catch (error) {
      // Erro tratado no contexto
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border border-white/50 backdrop-blur-sm">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gray-900 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-gray-200">
            <Lock className="text-white" size={40} />
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-1">
            Acesso Administrativo
          </h1>
          <p className="text-gray-500 font-medium">Faça login para acessar o painel</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">
              Usuário
            </label>
            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" size={20} />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase())}
                placeholder="admin"
                className="input-field pl-10 h-12"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">
              Senha
            </label>
            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" size={20} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field pl-10 h-12"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 rounded-2xl font-black text-lg transition-all duration-300 shadow-lg active:scale-95 disabled:bg-gray-300 disabled:shadow-none flex items-center justify-center gap-2 bg-gray-900 text-white hover:bg-black shadow-gray-200"
          >
            {loading ? (
              <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Lock size={20} />
                Acessar Painel
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/')}
            className="text-sm text-gray-500 hover:text-gray-700 font-medium"
          >
            ← Voltar para o catálogo
          </button>
        </div>
      </div>
    </div>
  )
}
