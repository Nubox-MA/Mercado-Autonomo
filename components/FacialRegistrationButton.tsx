'use client'

import { useEffect, useState } from 'react'
import { useCondominium } from '@/contexts/CondominiumContext'
import { DoorOpen, Shield } from 'lucide-react'
import axios from 'axios'

interface FacialRegistrationConfig {
  neighborhoodId: string
  url: string
  enabled: boolean
}

export default function FacialRegistrationButton() {
  const { selectedCondominium } = useCondominium()
  const [config, setConfig] = useState<FacialRegistrationConfig | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (selectedCondominium) {
      fetchConfig()
    } else {
      setLoading(false)
    }
  }, [selectedCondominium])

  const fetchConfig = async () => {
    if (!selectedCondominium) {
      setLoading(false)
      return
    }

    try {
      const response = await axios.get('/api/admin/settings')
      const data = response.data

      // Buscar configuração específica do local atual
      const facialConfigsJson = data.facialRegistrationConfigs || '[]'
      let configs: FacialRegistrationConfig[] = []
      
      try {
        configs = JSON.parse(facialConfigsJson)
      } catch (e) {
        console.error('Erro ao parsear facialRegistrationConfigs:', e)
      }

      // Encontrar configuração do local atual
      const currentConfig = configs.find(
        (c) => c.neighborhoodId === selectedCondominium.id && c.enabled
      )

      setConfig(currentConfig || null)
    } catch (error) {
      console.error('Erro ao buscar configurações:', error)
      setConfig(null)
    } finally {
      setLoading(false)
    }
  }

  // Se não tiver configurações carregadas ou não tiver config para este local, não mostra
  if (loading || !config || !config.url || !selectedCondominium) {
    return null
  }

  const handleClick = () => {
    if (config.url) {
      window.open(config.url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className="w-full bg-gradient-to-r from-primary-500 to-primary-600 py-5 px-6 shadow-lg">
      <div className="container mx-auto">
        <button
          onClick={handleClick}
          className="w-full bg-white rounded-2xl hover:bg-gray-50 transition-all shadow-lg hover:shadow-xl active:scale-95 overflow-hidden"
        >
          <div className="flex items-center gap-4 p-4">
            {/* Ícone de Porta */}
            <div className="flex-shrink-0 bg-primary-100 rounded-xl p-3">
              <DoorOpen size={32} className="text-primary-600" />
            </div>
            
            {/* Texto */}
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-black text-lg text-gray-900">Abrir Porta</h3>
                <Shield size={16} className="text-green-600" />
              </div>
              <p className="text-sm text-gray-600">
                Cadastre seu reconhecimento facial para acessar a loja
              </p>
            </div>
            
            {/* Seta */}
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-primary-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}
