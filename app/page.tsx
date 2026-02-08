'use client'

import { useEffect, useState } from 'react'
import { useCondominium } from '@/contexts/CondominiumContext'
import { useRouter } from 'next/navigation'
import { useCart } from '@/contexts/CartContext'
import { useFavorites } from '@/contexts/FavoritesContext'
import { useNavigation } from '@/contexts/NavigationContext'
import Navbar from '@/components/Navbar'
import ProductCard from '@/components/ProductCard'
import SearchBar from '@/components/SearchBar'
import Footer from '@/components/Footer'
import FavoriteProductCard from '@/components/FavoriteProductCard'
import ConfirmModal from '@/components/ConfirmModal'
import axios from 'axios'
import toast from 'react-hot-toast'
import Image from 'next/image'

import { LayoutGrid, List, Square, Package, Heart, ShoppingCart, Trash2, Plus, Minus, ShoppingBag } from 'lucide-react'

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
  const { addItem, items, removeItem, updateQuantity, clearCart, total } = useCart()
  const { favorites, isFavorited, toggleFavorite, clearFavorites } = useFavorites()
  const { activeTab } = useNavigation()
  const router = useRouter()
  const [showClearFavoritesModal, setShowClearFavoritesModal] = useState(false)
  const [showClearCartModal, setShowClearCartModal] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [itemsPerPage, setItemsPerPage] = useState(40)
  
  // New Filter States
  const [sortBy, setSortBy] = useState('name')
  const [isPromotion, setIsPromotion] = useState(true) // Por padrão, mostrar ofertas
  const [isNew, setIsNew] = useState(false)
  // Inicializar com valor do localStorage ou padrão
  const [viewMode, setViewMode] = useState<'list' | 'single' | 'double'>(() => {
    // Verificar se estamos no cliente antes de acessar localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('productViewMode')
      if (saved && ['list', 'single', 'double'].includes(saved)) {
        return saved as 'list' | 'single' | 'double'
      }
      // Se não tiver salvo, usar 'single' como padrão (1 produto por linha)
      return 'single'
    }
    return 'single'
  })

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

  // Carregar preferência de visualização do localStorage (backup)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedViewMode = localStorage.getItem('productViewMode') as 'list' | 'single' | 'double' | null
      if (savedViewMode && ['list', 'single', 'double'].includes(savedViewMode)) {
        setViewMode(savedViewMode)
      }
    }
  }, [])

  // Salvar preferência de visualização no localStorage sempre que mudar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('productViewMode', viewMode)
    }
  }, [viewMode])

  useEffect(() => {
    if (selectedCondominium) {
      fetchProducts()
    }
  }, [selectedCondominium, selectedCategory, searchQuery, sortBy, isPromotion, isNew])

  // Sempre que filtros ou busca mudarem, voltar para a primeira página
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedCategory, searchQuery, sortBy, isPromotion, isNew, selectedCondominium, itemsPerPage])

  // Buscar configuração de itens por página (20, 30, 40) do painel admin
  useEffect(() => {
    const fetchItemsPerPageSetting = async () => {
      try {
        const response = await axios.get('/api/admin/settings')
        const value = response.data?.catalogItemsPerPage
        const parsed = parseInt(value, 10)
        if ([20, 30, 40].includes(parsed)) {
          setItemsPerPage(parsed)
        }
      } catch (error) {
        console.error('Erro ao buscar configuração de itens por página:', error)
      }
    }
    fetchItemsPerPageSetting()
  }, [])

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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price)
  }

  const getItemPrice = (item: any) => {
    return item.isPromotion && item.promoPrice ? item.promoPrice : item.price
  }

  // Paginação no catálogo (somente front-end)
  const ITEMS_PER_PAGE = itemsPerPage
  const totalPages = Math.max(1, Math.ceil(products.length / ITEMS_PER_PAGE))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedProducts = products.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    const targetPage = Math.min(Math.max(1, page), totalPages)
    setCurrentPage((prev) => {
      if (prev === targetPage) return prev
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
      return targetPage
    })
  }

  const renderPagination = () => {
    if (totalPages <= 1) return null

    // Se poucas páginas, mostrar todas
    if (totalPages <= 7) {
      const allPages = Array.from({ length: totalPages }, (_, index) => index + 1)

      return (
        <div className="flex flex-col items-center gap-3 mt-6">
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <button
              onClick={() => handlePageChange(safeCurrentPage - 1)}
              disabled={safeCurrentPage === 1}
              className={`px-4 py-2 rounded-full text-sm font-medium border ${
                safeCurrentPage === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Anterior
            </button>

            {allPages.map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`w-9 h-9 rounded-full text-sm font-semibold border transition ${
                  page === safeCurrentPage
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => handlePageChange(safeCurrentPage + 1)}
              disabled={safeCurrentPage === totalPages}
              className={`px-4 py-2 rounded-full text-sm font-medium border ${
                safeCurrentPage === totalPages
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Próxima
            </button>
          </div>
        </div>
      )
    }

    // Quando há muitas páginas, mostrar janela limitada com reticências
    const pages: (number | 'left-ellipsis' | 'right-ellipsis')[] = []

    const firstPage = 1
    const lastPage = totalPages

    // Sempre mostrar primeira página
    pages.push(firstPage)

    let start: number
    let end: number

    if (safeCurrentPage <= 3) {
      // Nas primeiras páginas: 1, 2, 3, 4, ... , last
      start = 2
      end = Math.min(4, lastPage - 1)
    } else if (safeCurrentPage >= lastPage - 2) {
      // Nas últimas páginas: 1, ..., last-3, last-2, last-1, last
      start = Math.max(lastPage - 3, 2)
      end = lastPage - 1
    } else {
      // Meio: 1, ..., current-1, current, current+1, current+2, ..., last
      start = safeCurrentPage - 1
      end = Math.min(safeCurrentPage + 2, lastPage - 1)
    }

    if (start > 2) {
      pages.push('left-ellipsis')
    }

    for (let page = start; page <= end; page++) {
      pages.push(page)
    }

    if (end < lastPage - 1) {
      pages.push('right-ellipsis')
    }

    // Sempre mostrar última página
    pages.push(lastPage)

    return (
      <div className="flex flex-col items-center gap-3 mt-6">
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <button
            onClick={() => handlePageChange(safeCurrentPage - 1)}
            disabled={safeCurrentPage === 1}
            className={`px-4 py-2 rounded-full text-sm font-medium border ${
              safeCurrentPage === 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Anterior
          </button>

          {pages.map((page, index) => {
            if (page === 'left-ellipsis' || page === 'right-ellipsis') {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="px-2 text-gray-400 select-none"
                >
                  ...
                </span>
              )
            }

            return (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`w-9 h-9 rounded-full text-sm font-semibold border transition ${
                  page === safeCurrentPage
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            )
          })}

          <button
            onClick={() => handlePageChange(safeCurrentPage + 1)}
            disabled={safeCurrentPage === totalPages}
            className={`px-4 py-2 rounded-full text-sm font-medium border ${
              safeCurrentPage === totalPages
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Próxima
          </button>
        </div>
      </div>
    )
  }

  // Renderizar conteúdo baseado na aba ativa
  const renderContent = () => {
    if (activeTab === 'favorites') {
      return (
        <>
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
                onClick={() => setShowClearFavoritesModal(true)}
                className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition flex items-center gap-2"
                title="Limpar lista de favoritos"
              >
                <Trash2 size={20} />
                <span className="hidden sm:inline font-medium">Limpar Lista</span>
              </button>
            )}
          </div>

          {favorites.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed">
              <div className="text-6xl mb-4">❤️</div>
              <h3 className="text-xl font-bold text-gray-800">Você ainda não favoritou nada</h3>
              <p className="text-gray-500 mb-6 text-sm">Toque no coração nos produtos para salvá-los aqui.</p>
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
        </>
      )
    }

    if (activeTab === 'cart') {
      return (
        <>
          <h1 className="text-3xl font-black text-gray-900 mb-6">Minha Lista de Compras</h1>

          {items.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl shadow-sm border-2 border-dashed">
              <div className="text-6xl mb-4">🛒</div>
              <p className="text-gray-600 text-lg mb-4 font-medium">
                Sua lista está vazia
              </p>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Items List */}
              <div className="lg:col-span-2 space-y-4">
                {items.map((item) => {
                  const price = getItemPrice(item)
                  return (
                    <div key={item.id} className="bg-white rounded-xl shadow-sm border p-4 flex gap-4">
                      <div className="relative w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        {item.imageUrl ? (
                          <Image
                            src={item.imageUrl}
                            alt={item.name}
                            fill
                            sizes="96px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <ShoppingBag size={32} />
                          </div>
                        )}
                      </div>

                      <div className="flex-1">
                        <h3 className="font-bold text-lg mb-1">{item.name}</h3>
                        <div className="flex flex-col">
                          {item.isPromotion && item.promoPrice && (
                            <span className="text-xs text-gray-400 line-through">
                              {formatPrice(item.price)}
                            </span>
                          )}
                          <p className={`font-bold text-lg ${item.isPromotion ? 'text-red-600' : 'text-primary-600'}`}>
                            {formatPrice(price)}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end justify-between">
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition"
                          title="Remover"
                        >
                          <Trash2 size={20} />
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition"
                          >
                            <Minus size={18} />
                          </button>
                          <span className="w-12 text-center font-bold text-lg">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition"
                          >
                            <Plus size={18} />
                          </button>
                        </div>

                        <p className="text-lg font-black text-primary-600">
                          {formatPrice(price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Summary */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-xl shadow-sm border p-6 sticky top-4 space-y-6">
                  <h2 className="text-xl font-black border-b pb-4">Resumo da Lista</h2>

                  <div className="space-y-3">
                    <div className="flex justify-between text-gray-600">
                      <span>Quantidade de produtos:</span>
                      <span className="font-bold">{items.length}</span>
                    </div>

                    <div className="flex justify-between text-gray-600">
                      <span>Total de itens:</span>
                      <span className="font-bold">{items.reduce((sum, item) => sum + item.quantity, 0)}</span>
                    </div>
                    
                    <div className="pt-4 border-t">
                      <div className="flex justify-between items-end">
                        <span className="text-gray-900 font-bold text-lg">Total:</span>
                        <div className="text-right">
                          <span className="block text-3xl font-black text-primary-600">
                            {formatPrice(total)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowClearCartModal(true)}
                    className="w-full py-3 bg-red-50 text-red-600 rounded-lg font-bold hover:bg-red-100 transition"
                  >
                    Limpar Lista
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )
    }

    // Default: Home (Catálogo)
    return (
      <>
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900">Catálogo</h1>
            <p className="text-gray-500">Encontre o que você precisa hoje</p>
          </div>
          {/* Botões de Visualização */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded transition ${
                viewMode === 'list'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="Lista"
            >
              <List size={18} />
            </button>
            <button
              onClick={() => setViewMode('single')}
              className={`p-1.5 rounded transition ${
                viewMode === 'single'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="1 produto por linha"
            >
              <Square size={18} />
            </button>
            <button
              onClick={() => setViewMode('double')}
              className={`p-1.5 rounded transition ${
                viewMode === 'double'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="2 produtos por linha"
            >
              <LayoutGrid size={18} />
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
        ) : viewMode === 'list' ? (
          <>
            <div className="space-y-3">
              {paginatedProducts.map((product) => (
              <div key={product.id} className="bg-white rounded-xl border p-4 hover:shadow-md transition">
                <div className="flex gap-4">
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        sizes="96px"
                        loading="lazy"
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
                          addItem(product, 1)
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

            {renderPagination()}
          </>
        ) : viewMode === 'single' ? (
          <>
            <div className="grid grid-cols-1 gap-4 sm:gap-6">
              {paginatedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {renderPagination()}
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              {paginatedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {renderPagination()}
          </>
        )}
      </>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        {renderContent()}
      </div>

      <Footer />

      {/* Modais de confirmação */}
      <ConfirmModal
        isOpen={showClearFavoritesModal}
        onClose={() => setShowClearFavoritesModal(false)}
        onConfirm={() => {
          clearFavorites()
          setShowClearFavoritesModal(false)
        }}
        title="Limpar Lista de Favoritos?"
        message="Tem certeza que deseja remover todos os produtos dos favoritos? Esta ação não pode ser desfeita."
        confirmText="Sim, Limpar"
        cancelText="Cancelar"
        type="danger"
      />

      <ConfirmModal
        isOpen={showClearCartModal}
        onClose={() => setShowClearCartModal(false)}
        onConfirm={() => {
          clearCart()
          setShowClearCartModal(false)
        }}
        title="Limpar Lista de Compras?"
        message="Tem certeza que deseja remover todos os produtos da lista? Esta ação não pode ser desfeita."
        confirmText="Sim, Limpar"
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  )
}

