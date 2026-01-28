'use client'

import { Clock, Info } from 'lucide-react'
import { useEffect, useState } from 'react'
import axios from 'axios'

export default function Footer() {
  const [whatsapp, setWhatsapp] = useState('5500000000000')

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await axios.get('/api/admin/settings')
        if (response.data.whatsapp) {
          setWhatsapp(response.data.whatsapp)
        }
      } catch (error) {
        console.error('Erro ao buscar configurações do footer:', error)
      }
    }
    fetchSettings()
  }, [])

  return (
    <footer 
      className="bg-white border-t mt-12 py-12 pb-24 sm:pb-12"
      style={{ paddingBottom: 'calc(6rem + var(--sab, 0px))' }}
    >
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Horário */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary-600">
              <Clock size={24} />
              <h3 className="font-bold uppercase tracking-wider">Funcionamento</h3>
            </div>
            <div className="space-y-1 text-gray-600">
              <p className="font-medium text-sm">Estamos abertos 24 horas</p>
            </div>
          </div>

          {/* Ajuda */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary-600">
              <Info size={24} />
              <h3 className="font-bold uppercase tracking-wider">Precisa de Ajuda?</h3>
            </div>
            <div className="space-y-3 text-gray-600">
              <p className="text-sm">Dúvidas ou problemas com produtos?</p>
              <a 
                href={`https://wa.me/${whatsapp}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md active:scale-95 group"
              >
                <svg 
                  viewBox="0 0 24 24" 
                  width="20" 
                  height="20" 
                  fill="currentColor"
                  className="group-hover:rotate-12 transition-transform"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.937 3.659 1.432 5.631 1.433h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                Chamar no WhatsApp
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t text-center text-gray-400 text-sm">
          <p>&copy; {new Date().getFullYear()} Mercado Autônomo - Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  )
}
