'use client'

import { useEffect, useState } from 'react'
import { useCondominium } from '@/contexts/CondominiumContext'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import ProductCard from '@/components/ProductCard'
import SearchBar from '@/components/SearchBar'
import Footer from '@/components/Footer'
import axios from 'axios'
import toast from 'react-hot-toast'

import { ChevronDown, Filter, SlidersHorizontal } from 'lucide-react'

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
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [showFilters, setShowFilters] = useState(false)

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
      if (minPrice) params.append('minPrice', minPrice)
      if (maxPrice) params.append('maxPrice', maxPrice)

      const response = await axios.get(`/api/products?${params}`)
      setProducts(response.data.products)
    } catch (error) {
      console.error('Error fetching products:', error)
      toast.error('Erro ao carregar produtos')
    } finally {
      setLoading(false)
    }
  }

  const handleApplyPriceFilter = (e: React.FormEvent) => {
    e.preventDefault()
    fetchProducts()
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
        </div>

        {/* Search and Quick Filters */}
        <div className="space-y-4 mb-8">
          <div className="flex gap-2">
            <div className="flex-1">
              <SearchBar onSearch={setSearchQuery} />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-xl border flex items-center gap-2 transition font-medium ${showFilters ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              <SlidersHorizontal size={20} />
              <span className="hidden sm:inline">Filtros</span>
            </button>
          </div>

          {/* Advanced Filters Panel */}
          {showFilters && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Sort */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Ordenar por</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full p-2 rounded-lg border focus:ring-2 focus:ring-primary-500 outline-none"
                  >
                    <option value="name">Nome (A-Z)</option>
                    <option value="price_asc">Menor Preço</option>
                    <option value="price_desc">Maior Preço</option>
                    <option value="views">Mais Vistos</option>
                    <option value="newest">Lançamentos</option>
                  </select>
                </div>

                {/* Price Range */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Faixa de Preço</label>
                  <form onSubmit={handleApplyPriceFilter} className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      className="w-full p-2 rounded-lg border text-sm"
                    />
                    <span className="text-gray-400">-</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      className="w-full p-2 rounded-lg border text-sm"
                    />
                    <button type="submit" className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200">
                      OK
                    </button>
                  </form>
                </div>

                {/* Status Toggles */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Destaques</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsPromotion(!isPromotion)}
                      className={`flex-1 py-2 rounded-lg border text-sm font-medium transition ${isPromotion ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-gray-600'}`}
                    >
                      🔥 Promoções
                    </button>
                    <button
                      onClick={() => setIsNew(!isNew)}
                      className={`flex-1 py-2 rounded-lg border text-sm font-medium transition ${isNew ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white text-gray-600'}`}
                    >
                      ✨ Novidades
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

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
                setMinPrice('')
                setMaxPrice('')
                setSortBy('name')
              }}
              className="text-primary-600 font-bold hover:underline"
            >
              Limpar todos os filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}

