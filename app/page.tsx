'use client'

import { useEffect, useState } from 'react'
import { useCondominium } from '@/contexts/CondominiumContext'
import { useRouter } from 'next/navigation'
import { useCart } from '@/contexts/CartContext'
import { useFavorites } from '@/contexts/FavoritesContext'
import Navbar from '@/components/Navbar'
import ProductCard from '@/components/ProductCard'
import SearchBar from '@/components/SearchBar'
import Footer from '@/components/Footer'
import axios from 'axios'
import toast from 'react-hot-toast'
import Image from 'next/image'

import { LayoutGrid, List, Package, Heart, ShoppingCart } from 'lucide-react'

interface Product {
  id: string
  name: string
  description?: string
  price: number
  promoPrice?: number
  isPromotion: boolean
  isNew: boolean
  stock: number
  active: boolean
  imageUrl?: string
  category?: {
    id: string
    name: string
  }
}

interface Category {
  id: string
  name: string
  _count: {
    products: number
  }
}

export default function Home() {
  const { selectedCondominium, isLoading: condominiumLoading } = useCondominium()
  const { addItem } = useCart()
  const { isFavorited, toggleFavorite } = useFavorites()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  
  // New Filter States
  const [sortBy, setSortBy] = useState('name')
  const [isPromotion, setIsPromotion] = useState(false)
  const [isNew, setIsNew] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  useEffect(() => {
    // Se não tiver condomínio selecionado, redireciona para seleção
    if (!condominiumLoading && !selectedCondominium) {
      router.push('/select-condominium')
    }
  }, [selectedCondominium, condominiumLoading, router])

  useEffect(() => {
    if (selectedCondominium) {
      fetchCategories()
    }
  }, [selectedCondominium])

  // Carregar preferência de visualização do localStorage
  useEffect(() => {
    const savedViewMode = localStorage.getItem('productViewMode') as 'grid' | 'list' | null
    if (savedViewMode) {
      setViewMode(savedViewMode)
    }
  }, [])

  // Salvar preferência de visualização no localStorage
  useEffect(() => {
    localStorage.setItem('productViewMode', viewMode)
  }, [viewMode])

  useEffect(() => {
    if (selectedCondominium) {
      fetchProducts()
    }
  }, [selectedCondominium, selectedCategory, searchQuery, sortBy, isPromotion, isNew])

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/categories')
      setCategories(response.data.categories)
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchProducts = async () => {
    if (!selectedCondominium) return
    
    try {
      setLoading(true)
      const params = new URLSearchParams({
        sortBy,
        neighborhoodId: selectedCondominium.id,
      })

      if (searchQuery) params.append('search', searchQuery)
      if (selectedCategory) params.append('categoryId', selectedCategory)
      if (isPromotion) params.append('isPromotion', 'true')
      if (isNew) params.append('isNew', 'true')

      const response = await axios.get(`/api/products?${params}`)
      setProducts(response.data.products)
    } catch (error) {
      console.error('Error fetching products:', error)
      toast.error('Erro ao carregar produtos')
    } finally {
      setLoading(false)
    }
  }


  if (condominiumLoading || !selectedCondominium) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-500 font-medium">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900">Catálogo</h1>
            <p className="text-gray-500">Encontre o que você precisa hoje</p>
          </div>
          {/* Botões de Visualização */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded transition ${
                viewMode === 'grid'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="Visualização em grade"
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded transition ${
                viewMode === 'list'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="Visualização em lista"
            >
              <List size={18} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="space-y-4 mb-8">
          <div className="flex-1">
            <SearchBar onSearch={setSearchQuery} />
          </div>

          {/* Categories Horizontal Scroll */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {/* Novidades */}
            <button
              onClick={() => {
                setIsNew(!isNew)
                setIsPromotion(false)
                setSelectedCategory('')
              }}
              className={`px-4 py-2 rounded-xl whitespace-nowrap text-sm font-bold transition-all flex items-center gap-2 ${
                isNew
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                  : 'bg-white text-blue-600 hover:bg-blue-50 border border-blue-100'
              }`}
            >
              Novidades
            </button>

            {/* Ofertas */}
            <button
              onClick={() => {
                setIsPromotion(!isPromotion)
                setIsNew(false)
                setSelectedCategory('')
              }}
              className={`px-4 py-2 rounded-xl whitespace-nowrap text-sm font-bold transition-all flex items-center gap-2 ${
                isPromotion
                  ? 'bg-red-600 text-white shadow-lg shadow-red-200'
                  : 'bg-white text-red-600 hover:bg-red-50 border border-red-100'
              }`}
            >
              Ofertas
            </button>

            <button
              onClick={() => {
                setSelectedCategory('')
                setIsPromotion(false)
                setIsNew(false)
              }}
              className={`px-4 py-2 rounded-xl whitespace-nowrap text-sm font-bold transition-all ${
                selectedCategory === '' && !isPromotion && !isNew
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-200'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border'
              }`}
            >
              Todas
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => {
                  setSelectedCategory(category.id)
                  setIsPromotion(false)
                  setIsNew(false)
                }}
                className={`px-4 py-2 rounded-xl whitespace-nowrap text-sm font-bold transition-all ${
                  selectedCategory === category.id
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-200'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-500 font-medium">Buscando os melhores produtos...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-bold text-gray-800">Nenhum produto encontrado</h3>
            <p className="text-gray-500 mb-6">Tente ajustar seus filtros ou busca.</p>
            <button
              onClick={() => {
                setSelectedCategory('')
                setSearchQuery('')
                setIsPromotion(false)
                setIsNew(false)
                setSortBy('name')
              }}
              className="text-primary-600 font-bold hover:underline"
            >
              Limpar todos os filtros
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {products.map((product) => (
              <div key={product.id} className="bg-white rounded-xl border p-4 hover:shadow-md transition">
                <div className="flex gap-4">
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        sizes="96px"
                        className="object-contain"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Package size={32} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-1 truncate">{product.name}</h3>
                          {product.category && (
                            <span className="inline-block px-2 py-1 bg-primary-50 text-primary-600 text-xs font-medium rounded mb-2">
                              {product.category.name}
                            </span>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          {product.isPromotion && product.promoPrice ? (
                            <div>
                              <p className="text-sm text-gray-500 line-through">R$ {product.price.toFixed(2).replace('.', ',')}</p>
                              <p className="text-xl font-black text-red-600">R$ {product.promoPrice.toFixed(2).replace('.', ',')}</p>
                            </div>
                          ) : (
                            <p className="text-xl font-black text-primary-600">R$ {product.price.toFixed(2).replace('.', ',')}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => toggleFavorite(product)}
                        className={`p-2 rounded-lg transition ${
                          isFavorited(product.id)
                            ? 'bg-red-50 text-red-600'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                        title={isFavorited(product.id) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                      >
                        <Heart size={18} fill={isFavorited(product.id) ? 'currentColor' : 'none'} />
                      </button>
                      <button
                        onClick={() => {
                          addItem(product, selectedCondominium!.id)
                          toast.success('Produto adicionado ao carrinho!')
                        }}
                        className="flex-1 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition flex items-center justify-center gap-2"
                      >
                        <ShoppingCart size={18} />
                        Adicionar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}

