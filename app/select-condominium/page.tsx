'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCondominium } from '@/contexts/CondominiumContext'
import axios from 'axios'
import toast from 'react-hot-toast'
import Image from 'next/image'
import { MapPin, ArrowRight } from 'lucide-react'

interface Condominium {
  id: string
  name: string
  photoUrl?: string
  active: boolean
}

export default function SelectCondominiumPage() {
  const router = useRouter()
  const { selectedCondominium, setSelectedCondominium, isLoading: condominiumLoading } = useCondominium()
  const [condominiums, setCondominiums] = useState<Condominium[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Se já tiver um condomínio selecionado, redireciona para a home
    if (!condominiumLoading && selectedCondominium) {
      router.push('/')
      return
    }

    fetchCondominiums()
  }, [selectedCondominium, condominiumLoading, router])

  const fetchCondominiums = async () => {
    try {
      const response = await axios.get('/api/admin/neighborhoods')
      // Garantir que response.data seja um array
      const data = Array.isArray(response.data) ? response.data : []
      const activeCondominiums = data
        .filter((c: Condominium) => c.active !== false) // Incluir se active for true ou undefined
        .sort((a: Condominium, b: Condominium) => a.name.localeCompare(b.name))
      setCondominiums(activeCondominiums)
    } catch (error: any) {
      console.error('Erro ao buscar condomínios:', error)
      // Se for erro 500 ou outro erro, mostrar mensagem mas não quebrar
      if (error.response?.status === 500) {
        console.error('Erro 500 na API de neighborhoods:', error.response?.data)
      }
      // Não mostrar toast de erro se a API retornar array vazio (status 200)
      if (error.response?.status !== 200) {
        toast.error('Erro ao carregar condomínios')
      }
      setCondominiums([]) // Garantir que seja array vazio
    } finally {
      setLoading(false)
    }
  }

  const handleSelectCondominium = (condominium: Condominium) => {
    setSelectedCondominium(condominium)
    toast.success(`Condomínio ${condominium.name} selecionado!`)
    router.push('/')
  }

  if (condominiumLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 font-medium">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-primary-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-primary-200">
            <MapPin className="text-white" size={40} />
          </div>
          <h1 className="text-3xl font-black text-primary-600 tracking-tight mb-2">
            Escolha seu Condomínio
          </h1>
          <p className="text-gray-600 font-medium">
            Selecione o mercado do seu condomínio para ver os produtos disponíveis
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {condominiums.map((condominium) => (
            <button
              key={condominium.id}
              onClick={() => handleSelectCondominium(condominium)}
              className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group hover:scale-105 active:scale-95"
            >
              <div className="relative h-48 bg-gray-100">
                {condominium.photoUrl ? (
                  <Image
                    src={condominium.photoUrl}
                    alt={condominium.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-contain group-hover:scale-110 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-100 to-primary-200">
                    <MapPin className="text-primary-600" size={64} />
                  </div>
                )}
              </div>
              <div className="p-6">
                <h3 className="text-xl font-black text-gray-900 mb-2 flex items-center justify-between">
                  {condominium.name}
                  <ArrowRight className="text-primary-600 group-hover:translate-x-1 transition-transform" size={24} />
                </h3>
                <p className="text-gray-500 text-sm">
                  Clique para ver os produtos disponíveis
                </p>
              </div>
            </button>
          ))}
        </div>

        {condominiums.length === 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <p className="text-gray-600">Nenhum condomínio disponível no momento.</p>
          </div>
        )}
      </div>
    </div>
  )
}
