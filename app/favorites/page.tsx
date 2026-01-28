'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useFavorites } from '@/contexts/FavoritesContext'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import ProductCard from '@/components/ProductCard'
import Footer from '@/components/Footer'
import { Heart } from 'lucide-react'

export default function FavoritesPage() {
  const { user, isLoading } = useAuth()
  const { favorites } = useFavorites()
  const router = useRouter()

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-red-100 text-red-600 rounded-2xl">
            <Heart size={32} fill="currentColor" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900">Meus Favoritos</h1>
            <p className="text-gray-500">Produtos que você mais gosta</p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {favorites.map((product: any) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
