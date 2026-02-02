'use client'

import { useFavorites } from '@/contexts/FavoritesContext'
import { useCondominium } from '@/contexts/CondominiumContext'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import FavoriteProductCard from '@/components/FavoriteProductCard'
import Footer from '@/components/Footer'
import ConfirmModal from '@/components/ConfirmModal'
import { Heart, Trash2 } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function FavoritesPage() {
  const { favorites, clearFavorites } = useFavorites()
  const { selectedCondominium, isLoading: condominiumLoading } = useCondominium()
  const router = useRouter()
  const [showClearModal, setShowClearModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Se não tiver condomínio selecionado, redireciona para seleção
    if (!condominiumLoading && !selectedCondominium) {
      router.push('/select-condominium')
      return
    }
    // Aguardar um pouco para garantir que os favoritos foram carregados
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 100)
    return () => clearTimeout(timer)
  }, [selectedCondominium, condominiumLoading, router])

  const handleClearFavorites = () => {
    clearFavorites()
    setShowClearModal(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 text-red-600 rounded-2xl">
              <Heart size={32} fill="currentColor" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-gray-900">Meus Favoritos</h1>
              <p className="text-gray-500">Produtos que você mais gosta</p>
            </div>
          </div>
          {favorites.length > 0 && (
            <button
              onClick={() => setShowClearModal(true)}
              className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition flex items-center gap-2"
              title="Limpar lista de favoritos"
            >
              <Trash2 size={20} />
              <span className="hidden sm:inline font-medium">Limpar Lista</span>
            </button>
          )}
        </div>

        {(isLoading || condominiumLoading) ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-500 font-medium">Carregando favoritos...</p>
          </div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed">
            <div className="text-6xl mb-4">❤️</div>
            <h3 className="text-xl font-bold text-gray-800">Você ainda não favoritou nada</h3>
            <p className="text-gray-500 mb-6 text-sm">Toque no coração nos produtos para salvá-los aqui.</p>
            <button
              onClick={() => router.push('/')}
              className="btn-primary"
            >
              Explorar Catálogo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {favorites
              .filter((product: any) => product && product.id && product.name)
              .map((product: any) => (
                <FavoriteProductCard key={product.id} product={product} />
              ))}
          </div>
        )}
      </main>

      <ConfirmModal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        onConfirm={handleClearFavorites}
        title="Limpar Lista de Favoritos?"
        message="Tem certeza que deseja remover todos os produtos dos favoritos? Esta ação não pode ser desfeita."
        confirmText="Sim, Limpar"
        cancelText="Cancelar"
        type="danger"
      />

      <Footer />
    </div>
  )
}
