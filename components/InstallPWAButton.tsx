'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPWAButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  
  // Detectar se é iOS/Safari
  const isIOS = typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent)
  const isSafari = typeof window !== 'undefined' && /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches

    // Se o app NÃO está em modo standalone mas o localStorage diz que está instalado,
    // limpamos a flag para poder mostrar o prompt novamente (caso o usuário tenha apagado o atalho)
    const installed = localStorage.getItem('pwa-installed')
    if (!isStandalone && installed === 'true') {
      localStorage.removeItem('pwa-installed')
    }

    // Se já está em standalone, não mostrar prompt
    if (isStandalone) {
      return
    }

    // Verificar se foi dispensado recentemente
    const dismissedUntil = localStorage.getItem('pwa-dismissed-until')
    if (dismissedUntil) {
      const dismissDate = new Date(dismissedUntil)
      if (dismissDate > new Date()) {
        setShowInstallPrompt(false)
        return
      }
    }

    // Escutar evento beforeinstallprompt (Chrome/Edge - Android/Desktop)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Mostrar nosso botão apenas se tiver deferredPrompt (Android/Chrome)
      setShowInstallPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Para iOS/Safari: mostrar instruções após alguns segundos (não tem evento beforeinstallprompt)
    if (isIOS || (isSafari && !window.matchMedia('(display-mode: standalone)').matches)) {
      setTimeout(() => {
        setShowInstallPrompt(true)
      }, 3000)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [isIOS, isSafari])

  const handleInstallClick = async () => {
    // Para iOS/Safari, mostrar instruções
    if (isIOS || isSafari) {
      // Mostrar modal com instruções para iOS
      alert(
        'Para instalar o NüBox:\n\n' +
        '1. Toque no botão "Compartilhar" (seta para cima)\n' +
        '2. Role para baixo e toque em "Adicionar à Tela de Início"\n' +
        '3. Toque em "Adicionar"'
      )
      setShowInstallPrompt(false)
      return
    }

    // Para Chrome/Edge (Android/Desktop) - usar prompt nativo diretamente
    if (deferredPrompt) {
      try {
        // Mostrar prompt de instalação nativo do Chrome
        await deferredPrompt.prompt()

        // Aguardar escolha do usuário
        const { outcome } = await deferredPrompt.userChoice

        if (outcome === 'accepted') {
          console.log('Usuário aceitou instalar o PWA')
          localStorage.setItem('pwa-installed', 'true')
        } else {
          console.log('Usuário recusou instalar o PWA')
        }

        setDeferredPrompt(null)
        setShowInstallPrompt(false)
      } catch (error) {
        console.error('Erro ao mostrar prompt de instalação:', error)
        setShowInstallPrompt(false)
      }
    }
  }

  const handleDismiss = () => {
    setShowInstallPrompt(false)
    // Não mostrar novamente por 7 dias
    const dismissUntil = new Date()
    dismissUntil.setDate(dismissUntil.getDate() + 7)
    localStorage.setItem('pwa-dismissed-until', dismissUntil.toISOString())
  }

  // Só mostrar nosso prompt se:
  // 1. iOS/Safari (instruções manuais)
  // 2. Android/Chrome com deferredPrompt (prompt nativo disponível)
  // Se não tiver deferredPrompt no Android/Chrome, não mostrar nosso prompt
  // e deixar o Chrome mostrar o banner nativo automaticamente
  if (!showInstallPrompt) {
    return null
  }

  // Para Android/Chrome, só mostrar se tiver deferredPrompt (vai usar prompt nativo)
  // Para iOS/Safari, sempre mostrar (instruções manuais)
  if (!isIOS && !isSafari && !deferredPrompt) {
    return null // Deixar Chrome mostrar o banner nativo automaticamente
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-primary-200 p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 bg-primary-100 rounded-xl p-2">
            <Download size={24} className="text-primary-600" />
          </div>
          
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 mb-1">Instalar NüBox</h3>
            <p className="text-sm text-gray-600 mb-3">
              Adicione o NüBox à sua tela inicial para acesso rápido
            </p>
            
            <div className="flex gap-2">
              <button
                onClick={handleInstallClick}
                className="flex-1 bg-primary-600 text-white font-bold py-2 px-4 rounded-xl hover:bg-primary-700 transition-colors text-sm"
              >
                {isIOS || isSafari ? 'Ver Instruções' : deferredPrompt ? 'Instalar' : 'Instalar'}
              </button>
              <button
                onClick={handleDismiss}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Fechar"
              >
                <X size={20} />
              </button>
            </div>
            {(isIOS || isSafari) && (
              <p className="text-xs text-gray-500 mt-2 text-center">
                No iOS, use o botão &quot;Compartilhar&quot; do Safari
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
