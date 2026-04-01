'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import axios from 'axios'
import { Plus, Edit, Trash2, Upload, Search, X, ArrowUp, ArrowDown } from 'lucide-react'
import Image from 'next/image'
import toast from 'react-hot-toast'
import ConfirmModal from '@/components/ConfirmModal'

interface AdminStock {
  minStock: number | null
  hasLowStock: boolean
  hasZeroStock: boolean
  threshold: number
  stocksByLocation: { neighborhoodName: string; stock: number }[]
  lowStockLocations: { neighborhoodName: string; stock: number }[]
}

interface Product {
  id: string
  name: string
  description?: string
  price: number
  promoPrice?: number
  isPromotion: boolean
  isNew: boolean
  stock: number
  imageUrl?: string
  active: boolean
  views: number
  category?: {
    id: string
    name: string
  }
  adminStock?: AdminStock
}

interface Category {
  id: string
  name: string
}

/** Nome da categoria padrão do sistema (sync/import/API). */
function isSemCategoriaCategoryName(name: string | undefined | null): boolean {
  if (!name) return false
  return name.trim().replace(/\s+/g, ' ').toLowerCase() === 'sem categoria'
}

/** Produto “sem categoria” na prática: sem vínculo na listagem OU na categoria cadastrada “Sem Categoria”. */
function isSemCategoriaGroup(product: Product): boolean {
  if (!product.category?.id) return true
  return isSemCategoriaCategoryName(product.category.name)
}

interface Condominium {
  id: string
  name: string
  active: boolean
  displayOrder?: number | null
}

interface CondominiumPrice {
  condominiumId: string
  price: string
  promoPrice: string
  isPromotion: boolean
  available: boolean // Indica se o produto está disponível para este condomínio
}

export default function ProductsPage() {
  const { token } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [condominiums, setCondominiums] = useState<Condominium[]>([])
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState<{ id: string, name: string } | null>(null)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isCreatingCategoryLoading, setIsCreatingCategoryLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  /** '' = todas; '__none__' = sem categoria; senão id da categoria */
  const [filterCategoryId, setFilterCategoryId] = useState('')
  const [sortField, setSortField] = useState<'name' | 'category' | 'status' | 'stock' | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [onlyZeroStock, setOnlyZeroStock] = useState(false)
  const [hideAllLocationsZero, setHideAllLocationsZero] = useState(false)
  const [lowStockThreshold, setLowStockThreshold] = useState(10)
  const [tempLowStockInput, setTempLowStockInput] = useState('10')
  const [savingStockThreshold, setSavingStockThreshold] = useState(false)
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false)
  const [showDeleteAllConfirmModal, setShowDeleteAllConfirmModal] = useState(false)
  const [isDeletingAll, setIsDeletingAll] = useState(false)
  const [catalogItemsPerPage, setCatalogItemsPerPage] = useState<'20' | '30' | '40'>('40')
  const [showItemsPerPageModal, setShowItemsPerPageModal] = useState(false)
  const [tempCatalogItemsPerPage, setTempCatalogItemsPerPage] = useState<'20' | '30' | '40'>('40')

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    imageUrl: '',
    categoryId: '',
    isNew: false,
    active: true,
  })

  // Preços por condomínio
  const [condominiumPrices, setCondominiumPrices] = useState<Record<string, CondominiumPrice>>({})

  const fetchProducts = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!token) return
      try {
        if (!opts?.silent) setLoading(true)
        const response = await axios.get('/api/admin/products', {
          params: { _t: Date.now() },
          headers: { Authorization: `Bearer ${token}` },
        })
        setProducts(response.data.products)
        if (typeof response.data.lowStockThreshold === 'number') {
          setLowStockThreshold(response.data.lowStockThreshold)
          setTempLowStockInput(String(response.data.lowStockThreshold))
        }
      } catch (error) {
        console.error('Error fetching products:', error)
      } finally {
        if (!opts?.silent) setLoading(false)
      }
    },
    [token]
  )

  useEffect(() => {
    if (token) fetchProducts()
    fetchCategories()
    fetchCondominiums()
    fetchCatalogItemsPerPage()
  }, [token, fetchProducts])

  const fetchCatalogItemsPerPage = async () => {
    try {
      const response = await axios.get('/api/admin/settings')
      const value = response.data?.catalogItemsPerPage
      if (value === '20' || value === '30' || value === '40') {
        setCatalogItemsPerPage(value)
        setTempCatalogItemsPerPage(value)
      }
    } catch (error) {
      console.error('Erro ao buscar configuração de produtos por página do catálogo:', error)
    }
  }

  const fetchCondominiums = async () => {
    try {
      const response = await axios.get('/api/admin/neighborhoods', {
        params: { _t: Date.now() },
      })
      const activeCondominiums = response.data.filter((c: Condominium) => c.active)
      setCondominiums(activeCondominiums)
    } catch (error) {
      console.error('Error fetching condominiums:', error)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/categories')
      setCategories(response.data.categories)
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('Digite o nome da categoria')
      return
    }

    try {
      setIsCreatingCategoryLoading(true)
      const response = await axios.post(
        '/api/categories',
        { name: newCategoryName.trim() },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      
      const newCategory = response.data.category
      setCategories([...categories, newCategory])
      setFormData({ ...formData, categoryId: newCategory.id })
      setNewCategoryName('')
      setIsCreatingCategory(false)
      toast.success('Categoria criada com sucesso!')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao criar categoria')
    } finally {
      setIsCreatingCategoryLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Se estiver criando uma nova categoria, criar ela primeiro
    if (isCreatingCategory && newCategoryName.trim()) {
      try {
        setIsCreatingCategoryLoading(true)
        const response = await axios.post(
          '/api/categories',
          { name: newCategoryName.trim() },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )
        
        const newCategory = response.data.category
        setCategories([...categories, newCategory])
        setFormData({ ...formData, categoryId: newCategory.id })
        setNewCategoryName('')
        setIsCreatingCategory(false)
        toast.success('Categoria criada com sucesso!')
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'Erro ao criar categoria')
        setIsCreatingCategoryLoading(false)
        return // Não continuar se falhar ao criar categoria
      } finally {
        setIsCreatingCategoryLoading(false)
      }
    }

    // Validar que uma categoria foi selecionada
    if (!formData.categoryId) {
      toast.error('Selecione ou crie uma categoria')
      return
    }

    // Validar que pelo menos um preço por condomínio foi definido
    // Permitir que condomínios sem preço = produto indisponível para aquele condomínio
    const validPrices = Object.values(condominiumPrices).filter(
      (cp) => cp && cp.price && cp.price.toString().trim() !== '' && !isNaN(parseFloat(cp.price.toString())) && parseFloat(cp.price.toString()) > 0
    )

    console.log('Preços válidos encontrados:', validPrices.length, 'de', Object.keys(condominiumPrices).length)

    if (validPrices.length === 0) {
      toast.error('Defina pelo menos um preço para um condomínio (produtos sem preço não aparecerão no catálogo)')
      return
    }

    try {
      setIsSaving(true)
      
      // Usar o primeiro preço como preço padrão (necessário para o schema do Prisma)
      const firstPrice = validPrices[0]
      const defaultPrice = parseFloat(firstPrice.price.toString())
      
      if (isNaN(defaultPrice) || defaultPrice <= 0) {
        toast.error('Preço inválido encontrado')
        return
      }

      const mappedPrices = validPrices.map((cp) => {
        const price = parseFloat(cp.price.toString())
        const promoPrice = cp.promoPrice && cp.promoPrice.toString().trim() !== '' ? parseFloat(cp.promoPrice.toString()) : null
        
        if (isNaN(price) || price <= 0) {
          throw new Error(`Preço inválido para condomínio ${cp.condominiumId}`)
        }
        
        return {
          neighborhoodId: cp.condominiumId,
          price: price,
          promoPrice: promoPrice && !isNaN(promoPrice) && promoPrice > 0 ? promoPrice : null,
          isPromotion: cp.isPromotion || false,
          stock: 0,
        }
      })

      console.log('Preços mapeados:', mappedPrices)

      const data = {
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
        price: defaultPrice, // Preço padrão (será sobrescrito pelos preços por condomínio)
        promoPrice: null,
        isPromotion: false,
        isNew: formData.isNew,
        stock: 0, // Estoque padrão (não usado mais)
        imageUrl: formData.imageUrl?.trim() || null,
        categoryId: formData.categoryId || null,
        active: formData.active,
        // Preços por condomínio (obrigatórios)
        condominiumPrices: mappedPrices,
      }
      
      console.log('Dados a serem enviados:', JSON.stringify(data, null, 2))

      if (editingProduct) {
        console.log('Atualizando produto:', editingProduct.id, data)
        try {
          const response = await axios.put(`/api/products/${editingProduct.id}`, data, {
          headers: { Authorization: `Bearer ${token}` },
        })
          console.log('Produto atualizado com sucesso:', response.data)
        toast.success('Produto atualizado!')
        } catch (error: any) {
          console.error('Erro ao atualizar produto:', error)
          console.error('Resposta do erro:', error.response?.data)
          const errorMessage = error.response?.data?.error || 
                              error.response?.data?.details ||
                              error.message || 
                              'Erro ao atualizar produto'
          toast.error(`Erro: ${errorMessage}`, { duration: 5000 })
          throw error // Re-lançar para não continuar
        }
      } else {
        await axios.post('/api/products', data, {
          headers: { Authorization: `Bearer ${token}` },
        })
        toast.success('Produto criado!')
      }

      setShowModal(false)
      resetForm()
      fetchProducts()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao salvar produto')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!showDeleteModal) return

    const deletedId = showDeleteModal.id
    try {
      setIsDeleting(true)
      await axios.delete(`/api/products/${deletedId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setShowDeleteModal(null)
      setProducts((prev) => prev.filter((p) => p.id !== deletedId))
      toast.success('Produto deletado!')
      await fetchProducts({ silent: true })
    } catch (error) {
      toast.error('Erro ao deletar produto')
      fetchProducts({ silent: true })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteAll = async () => {
    try {
      setIsDeletingAll(true)

      const response = await axios.delete('/api/admin/products/delete-all', {
        headers: { Authorization: `Bearer ${token}` },
      })

      setProducts([])
      setShowDeleteAllModal(false)
      setShowDeleteAllConfirmModal(false)
      toast.success(
        response.data.message || `Todos os produtos foram deletados!`
      )
      await fetchProducts({ silent: true })
    } catch (error: any) {
      console.error('Delete all error:', error)
      toast.error(error.response?.data?.error || 'Erro ao deletar produtos')
      fetchProducts({ silent: true })
    } finally {
      setIsDeletingAll(false)
    }
  }

  const handleChangeCatalogItemsPerPage = async (value: '20' | '30' | '40') => {
    try {
      setCatalogItemsPerPage(value)
      await axios.post(
        '/api/admin/settings',
        { key: 'catalogItemsPerPage', value },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      toast.success('Quantidade de produtos por página atualizada!')
    } catch (error: any) {
      console.error('Erro ao atualizar configuração de produtos por página:', error)
      toast.error(error.response?.data?.error || 'Erro ao salvar configuração')
    }
  }

  const handleEdit = async (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      description: product.description || '',
      imageUrl: product.imageUrl || '',
      categoryId: product.category?.id || '',
      isNew: product.isNew,
      active: product.active,
    })
    
    // Inicializar com valores vazios para cada condomínio primeiro
    const pricesMap: Record<string, CondominiumPrice> = {}
    condominiums.forEach((cond) => {
      pricesMap[cond.id] = {
        condominiumId: cond.id,
        price: '',
        promoPrice: '',
        isPromotion: false,
        available: false, // Por padrão, não disponível até definir preço
      }
    })
    
    // Buscar preços por condomínio do produto
    try {
      const response = await axios.get(`/api/products/${product.id}`)
      const productData = response.data.product
      
      // Se o produto tiver preços por condomínio, carregar eles
      if (productData.productPrices && Array.isArray(productData.productPrices)) {
        productData.productPrices.forEach((pp: any) => {
          if (pricesMap[pp.neighborhoodId]) {
            pricesMap[pp.neighborhoodId] = {
              condominiumId: pp.neighborhoodId,
              price: pp.price.toString(),
              promoPrice: pp.promoPrice?.toString() || '',
              isPromotion: pp.isPromotion,
              available: true, // Se tem preço, está disponível
            }
          }
        })
      } else {
        // Se não houver preços por condomínio, usar o preço padrão do produto para todos
        condominiums.forEach((cond) => {
          if (!pricesMap[cond.id].price) {
            pricesMap[cond.id] = {
              condominiumId: cond.id,
              price: product.price.toString(),
              promoPrice: product.promoPrice?.toString() || '',
              isPromotion: product.isPromotion,
              available: true, // Se tem preço padrão, está disponível
            }
          }
        })
      }
    } catch (error) {
      console.error('Error fetching product prices:', error)
      // Em caso de erro, usar o preço padrão do produto
      condominiums.forEach((cond) => {
        pricesMap[cond.id] = {
          condominiumId: cond.id,
          price: product.price.toString(),
          promoPrice: product.promoPrice?.toString() || '',
          isPromotion: product.isPromotion,
          available: true, // Se tem preço padrão, está disponível
        }
      })
    }
    
    setCondominiumPrices(pricesMap)
    setShowModal(true)
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploading(true)
      const formDataUpload = new FormData()
      formDataUpload.append('file', file)

      const response = await axios.post('/api/upload', formDataUpload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      })

      setFormData((prev) => ({ ...prev, imageUrl: response.data.imageUrl }))
      toast.success('Imagem enviada!')
    } catch (error: any) {
      console.error('Erro ao fazer upload:', {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status,
        details: error?.response?.data?.details,
        context: error?.response?.data?.context,
        httpCode: error?.response?.data?.httpCode,
        errorName: error?.response?.data?.errorName
      })
      
      const errorMessage = error?.response?.data?.error || 'Erro ao enviar imagem'
      const errorDetails = error?.response?.data?.details
      const fullMessage = errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage
      
      toast.error(fullMessage)
    } finally {
      setUploading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      imageUrl: '',
      categoryId: '',
      isNew: false,
      active: true,
    })
    // Resetar preços por condomínio
    const pricesMap: Record<string, CondominiumPrice> = {}
    condominiums.forEach((cond) => {
      pricesMap[cond.id] = {
        condominiumId: cond.id,
        price: '',
        promoPrice: '',
        isPromotion: false,
        available: false, // Por padrão, não disponível
      }
    })
    setCondominiumPrices(pricesMap)
    setEditingProduct(null)
    setIsCreatingCategory(false)
    setNewCategoryName('')
  }

  // Inicializar preços por condomínio quando os condomínios forem carregados
  useEffect(() => {
    if (condominiums.length > 0 && Object.keys(condominiumPrices).length === 0 && !editingProduct) {
      const pricesMap: Record<string, CondominiumPrice> = {}
      condominiums.forEach((cond) => {
        pricesMap[cond.id] = {
          condominiumId: cond.id,
          price: '',
          promoPrice: '',
          isPromotion: false,
          available: false, // Por padrão, não disponível
        }
      })
      setCondominiumPrices(pricesMap)
    }
  }, [condominiums.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price)
  }

  // Função para lidar com ordenação
  const saveLowStockThreshold = async () => {
    if (!token) {
      toast.error('Sessão expirada')
      return
    }
    const n = parseInt(tempLowStockInput, 10)
    if (!Number.isFinite(n) || n < 0) {
      toast.error('Informe um número inteiro ≥ 0')
      return
    }
    if (n > 99999) {
      toast.error('Valor máximo: 99999')
      return
    }
    try {
      setSavingStockThreshold(true)
      await axios.post(
        '/api/admin/settings',
        { key: 'lowStockThreshold', value: String(n) },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setLowStockThreshold(n)
      toast.success('Limite de estoque baixo salvo')
      await fetchProducts({ silent: true })
    } catch {
      toast.error('Erro ao salvar limite')
    } finally {
      setSavingStockThreshold(false)
    }
  }

  const handleSort = (field: 'name' | 'category' | 'status' | 'stock') => {
    if (sortField === field) {
      // Se já está ordenando por este campo, alternar ordem
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      // Se é um novo campo, começar com ordem ascendente
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const hasStockByLocation = (p: Product) =>
    (p.adminStock?.stocksByLocation?.length ?? 0) > 0

  /** Tem preço em pelo menos um local e em todos os locais o estoque é 0. */
  const isZeroInEveryLocation = (p: Product) => {
    const locs = p.adminStock?.stocksByLocation
    if (!locs || locs.length === 0) return false
    return locs.every((s) => s.stock === 0)
  }

  const countZeroInSomeLocation = products.filter((p) => p.adminStock?.hasZeroStock).length
  const countLowStockProducts = products.filter((p) => p.adminStock?.hasLowStock).length

  // Filtrar e ordenar produtos
  const filteredAndSortedProducts = products
    .filter((product) => {
      if (onlyZeroStock && !product.adminStock?.hasZeroStock) return false
      if (hideAllLocationsZero && isZeroInEveryLocation(product)) return false
      if (filterCategoryId === '__none__') {
        if (!isSemCategoriaGroup(product)) return false
      } else if (filterCategoryId) {
        if (product.category?.id !== filterCategoryId) return false
      }
      if (!searchQuery) return true
      const query = searchQuery.toLowerCase()
      return (
        product.name.toLowerCase().includes(query) ||
        product.category?.name.toLowerCase().includes(query)
      )
    })
    .sort((a, b) => {
      if (sortField === 'name') {
        const result = a.name.localeCompare(b.name)
        return sortOrder === 'asc' ? result : -result
      } else if (sortField === 'category') {
        const categoryA = a.category?.name || 'Sem categoria'
        const categoryB = b.category?.name || 'Sem categoria'
        const result = categoryA.localeCompare(categoryB)
        return sortOrder === 'asc' ? result : -result
      } else if (sortField === 'status') {
        const statusA = a.active ? 1 : 0
        const statusB = b.active ? 1 : 0
        const result = statusA - statusB
        return sortOrder === 'asc' ? result : -result
      } else if (sortField === 'stock') {
        const aOk = hasStockByLocation(a)
        const bOk = hasStockByLocation(b)
        if (!aOk && !bOk) return 0
        if (!aOk) return 1
        if (!bOk) return -1
        const ka = a.adminStock!.minStock!
        const kb = b.adminStock!.minStock!
        const result = ka - kb
        return sortOrder === 'asc' ? result : -result
      }
      return 0
    })

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-3xl font-bold">Produtos</h1>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setTempCatalogItemsPerPage(catalogItemsPerPage)
                setShowItemsPerPageModal(true)
              }}
              className="px-4 py-2 rounded-full text-sm font-semibold border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 flex items-center gap-2"
            >
              Produtos por página no catálogo:
              <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-xs font-bold">
                {catalogItemsPerPage}
              </span>
            </button>
          <button
              onClick={() => setShowDeleteAllModal(true)}
              className="btn-secondary text-red-600 border-red-200 hover:bg-red-50 flex items-center gap-2 h-12"
          >
              <Trash2 size={20} />
              Apagar Todos
          </button>
          <button
            onClick={() => {
              resetForm()
              setShowModal(true)
            }}
            className="btn-primary flex items-center gap-2 h-12"
          >
            <Plus size={20} />
            Novo Produto
          </button>
        </div>
        </div>

        {/* Barra de Pesquisa e Filtros */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-stretch">
            <div className="flex-1 relative min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Pesquisar produto por nome ou categoria"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-10 pr-10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={18} />
                </button>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center lg:w-[min(100%,22rem)] shrink-0">
              <label htmlFor="admin-products-filter-category" className="text-sm font-bold text-gray-700 sm:sr-only">
                Filtrar por categoria
              </label>
              <select
                id="admin-products-filter-category"
                value={filterCategoryId}
                onChange={(e) => setFilterCategoryId(e.target.value)}
                className="input-field py-3 font-medium text-gray-800 cursor-pointer w-full"
              >
                <option value="">Todas as categorias</option>
                <option value="__none__">
                  Sem categoria (sem vínculo ou categoria &quot;Sem Categoria&quot;)
                </option>
                {[...categories]
                  .filter((c) => !isSemCategoriaCategoryName(c.name))
                  .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-x-8 sm:gap-y-1 text-sm text-gray-800">
              <p>
                <span className="font-semibold text-gray-700">
                  Quantidade de produtos com estoque zerado em algum local (loja):{' '}
                </span>
                <span className="font-bold text-gray-900 tabular-nums">{countZeroInSomeLocation}</span>
              </p>
              <p>
                <span className="font-semibold text-gray-700">Quantidade de produtos com estoque baixo: </span>
                <span className="font-bold text-gray-900 tabular-nums">{countLowStockProducts}</span>
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={onlyZeroStock}
                  onChange={(e) => setOnlyZeroStock(e.target.checked)}
                  className="w-5 h-5 mt-0.5 rounded border-gray-300 text-primary-600 shrink-0"
                />
                <span className="text-sm font-bold text-gray-800 leading-snug">
                  Mostrar na lista apenas produtos com estoque zerado em algum local (loja)
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hideAllLocationsZero}
                  onChange={(e) => setHideAllLocationsZero(e.target.checked)}
                  className="w-5 h-5 mt-0.5 rounded border-gray-300 text-primary-600 shrink-0"
                />
                <span className="text-sm text-gray-800 leading-snug">
                  <span className="font-bold">Ocultar da lista</span> produtos com estoque zerado em{' '}
                  <span className="font-bold">todos</span> os locais (se em pelo menos uma loja houver estoque, o
                  produto continua na lista)
                </span>
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-200 lg:justify-end">
              <span className="text-sm font-semibold text-gray-700">Alerta estoque baixo: menos de</span>
              <input
                type="number"
                min={0}
                max={99999}
                value={tempLowStockInput}
                onChange={(e) => setTempLowStockInput(e.target.value)}
                className="w-24 input-field py-2 text-center font-bold"
              />
              <span className="text-sm text-gray-600">un.</span>
              <button
                type="button"
                onClick={() => void saveLowStockThreshold()}
                disabled={savingStockThreshold}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {savingStockThreshold ? 'Salvando…' : 'Salvar limite'}
              </button>
              <span className="text-xs text-gray-500 max-w-[220px]">
                Atual: {lowStockThreshold} un. (define “estoque baixo”; salvar recarrega a lista)
              </span>
            </div>
          </div>
        </div>

        {(searchQuery || filterCategoryId || onlyZeroStock || hideAllLocationsZero) && (
          <p className="text-sm text-gray-600">
            {filteredAndSortedProducts.length} produto(s) na lista
            {filterCategoryId === '__none__' && ' (Sem categoria: sem vínculo + pasta &quot;Sem Categoria&quot;)'}
            {filterCategoryId &&
              filterCategoryId !== '__none__' &&
              ` (categoria: ${categories.find((c) => c.id === filterCategoryId)?.name ?? '—'})`}
            {onlyZeroStock && ' (só zerado em algum local)'}
            {hideAllLocationsZero && ' (ocultos: zerados em todos os locais)'}
            {searchQuery && ' (busca ativa)'}
          </p>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Imagem</th>
                <th className="text-left py-3 px-4">
                  <button
                    onClick={() => handleSort('name')}
                    className="flex items-center gap-2 hover:text-primary-600 transition-colors"
                  >
                    Nome
                    <div className="flex items-center gap-0.5">
                      <ArrowUp 
                        size={12} 
                        className={sortField === 'name' && sortOrder === 'asc' ? 'text-primary-600' : 'text-gray-300'} 
                      />
                      <ArrowDown 
                        size={12} 
                        className={sortField === 'name' && sortOrder === 'desc' ? 'text-primary-600' : 'text-gray-300'} 
                      />
                    </div>
                  </button>
                </th>
                <th className="text-left py-3 px-4">
                  <button
                    onClick={() => handleSort('category')}
                    className="flex items-center gap-2 hover:text-primary-600 transition-colors"
                  >
                    Categoria
                    <div className="flex items-center gap-0.5">
                      <ArrowUp 
                        size={12} 
                        className={sortField === 'category' && sortOrder === 'asc' ? 'text-primary-600' : 'text-gray-300'} 
                      />
                      <ArrowDown 
                        size={12} 
                        className={sortField === 'category' && sortOrder === 'desc' ? 'text-primary-600' : 'text-gray-300'} 
                      />
                    </div>
                  </button>
                </th>
                <th className="text-left py-3 px-4">
                  <button
                    onClick={() => handleSort('status')}
                    className="flex items-center gap-2 hover:text-primary-600 transition-colors"
                  >
                    Status
                    <div className="flex items-center gap-0.5">
                      <ArrowUp 
                        size={12} 
                        className={sortField === 'status' && sortOrder === 'asc' ? 'text-primary-600' : 'text-gray-300'} 
                      />
                      <ArrowDown 
                        size={12} 
                        className={sortField === 'status' && sortOrder === 'desc' ? 'text-primary-600' : 'text-gray-300'} 
                      />
                    </div>
                  </button>
                </th>
                <th className="text-left py-3 px-4">
                  <button
                    type="button"
                    onClick={() => handleSort('stock')}
                    className="flex items-center gap-2 hover:text-primary-600 transition-colors"
                  >
                    Estoque (locais)
                    <div className="flex items-center gap-0.5">
                      <ArrowUp
                        size={12}
                        className={
                          sortField === 'stock' && sortOrder === 'asc' ? 'text-primary-600' : 'text-gray-300'
                        }
                      />
                      <ArrowDown
                        size={12}
                        className={
                          sortField === 'stock' && sortOrder === 'desc' ? 'text-primary-600' : 'text-gray-300'
                        }
                      />
                    </div>
                  </button>
                </th>
                <th className="text-left py-3 px-4">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    {products.length === 0
                      ? 'Nenhum produto cadastrado'
                      : searchQuery
                        ? 'Nenhum produto encontrado com essa pesquisa'
                        : filterCategoryId
                          ? filterCategoryId === '__none__'
                            ? 'Nenhum produto em Sem categoria (sem vínculo ou pasta padrão) com os filtros atuais'
                            : 'Nenhum produto nesta categoria com os filtros atuais'
                          : onlyZeroStock
                            ? 'Nenhum produto com estoque zerado em algum local'
                            : hideAllLocationsZero
                              ? 'Nenhum produto nesta visualização com os filtros atuais'
                              : 'Nenhum produto cadastrado'}
                  </td>
                </tr>
              ) : (
                filteredAndSortedProducts.map((product) => (
                <tr key={product.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="relative w-16 h-16 bg-gray-100 rounded overflow-hidden">
                      {product.imageUrl ? (
                        <Image
                          src={product.imageUrl}
                          alt={product.name}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          📦
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-medium">{product.name}</td>
                  <td className="py-3 px-4">{product.category?.name || '-'}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        product.active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {product.active ? 'Disponível' : 'Indisponível'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm">
                    {product.adminStock == null || product.adminStock.stocksByLocation?.length === 0 ? (
                      <span className="text-gray-400 text-xs">Sem preço por local</span>
                    ) : (
                      <div className="space-y-1">
                        {product.adminStock.hasLowStock && (
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-900">
                            Estoque baixo
                          </span>
                        )}
                        <ul className="text-xs text-gray-600 max-w-[220px]">
                          {product.adminStock.stocksByLocation.map((loc) => (
                            <li
                              key={`${loc.neighborhoodName}-${loc.stock}`}
                              className={loc.stock === 0 ? 'text-red-700 font-semibold' : ''}
                            >
                              {loc.neighborhoodName}: {loc.stock} un.
                            </li>
                          ))}
                        </ul>
                        {!product.adminStock.hasLowStock && product.adminStock.minStock !== null && (
                          <span className="text-xs text-gray-500 block pt-1">
                            Mín.: <strong>{product.adminStock.minStock}</strong> un.
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(product)}
                        className="text-blue-600 hover:text-blue-800 p-1"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => setShowDeleteModal({ id: product.id, name: product.name })}
                        className="text-red-600 hover:text-red-800 p-1"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de configuração de produtos por página */}
      <ConfirmModal
        isOpen={showItemsPerPageModal}
        onClose={() => setShowItemsPerPageModal(false)}
        onConfirm={async () => {
          await handleChangeCatalogItemsPerPage(tempCatalogItemsPerPage)
          setShowItemsPerPageModal(false)
        }}
        title="Produtos por página no catálogo"
        message={
          <div className="space-y-4">
            <p className="text-sm">
              Escolha quantos produtos serão exibidos por página no catálogo do cliente.
            </p>
            <div className="flex items-center justify-center gap-3">
              {(['20', '30', '40'] as Array<'20' | '30' | '40'>).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTempCatalogItemsPerPage(value)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold border transition ${
                    tempCatalogItemsPerPage === value
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {value} por página
                </button>
              ))}
            </div>
          </div>
        }
        confirmText="Salvar"
        cancelText="Fechar"
        type="info"
      />

      {/* Modal de Confirmação 1 - Apagar Todos */}
      <ConfirmModal
        isOpen={showDeleteAllModal}
        onClose={() => setShowDeleteAllModal(false)}
        onConfirm={() => {
          setShowDeleteAllModal(false)
          setShowDeleteAllConfirmModal(true)
        }}
        title="⚠️ Atenção: Apagar TODOS os Produtos?"
        message={`Você está prestes a apagar TODOS os ${products.length} produtos do catálogo. Esta ação é IRREVERSÍVEL e não pode ser desfeita.`}
        confirmText="Sim, Quero Apagar Tudo"
        cancelText="Cancelar"
        type="danger"
      />

      {/* Modal de Confirmação 2 - Confirmação Final */}
      <ConfirmModal
        isOpen={showDeleteAllConfirmModal}
        onClose={() => setShowDeleteAllConfirmModal(false)}
        onConfirm={handleDeleteAll}
        title="🚨 CONFIRMAÇÃO FINAL - Apagar TODOS os Produtos?"
        message={`Você tem CERTEZA ABSOLUTA que deseja apagar TODOS os ${products.length} produtos? Esta é a ÚLTIMA confirmação. Após isso, todos os produtos serão PERMANENTEMENTE removidos.`}
        confirmText="SIM, APAGAR TUDO AGORA"
        cancelText="Cancelar"
        type="danger"
        isLoading={isDeletingAll}
      />

      {/* Modal */}
      <ConfirmModal
        isOpen={!!showDeleteModal}
        onClose={() => setShowDeleteModal(null)}
        onConfirm={handleDelete}
        title="Excluir Produto?"
        message={`Tem certeza que deseja excluir o produto "${showDeleteModal?.name}"? Esta ação não pode ser desfeita.`}
        confirmText="Sim, Excluir"
        cancelText="Cancelar"
        type="danger"
        isLoading={isDeleting}
      />

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">
                {editingProduct ? 'Editar Produto' : 'Novo Produto'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Informações Básicas */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-900 border-b pb-2">
                    Informações Básicas
                  </h3>
                  
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Nome do Produto *
                    </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="input-field"
                      placeholder="Ex: Bis Xtra 45g"
                    required
                  />
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                    Descrição
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="input-field"
                    rows={3}
                      placeholder="Descreva o produto..."
                  />
                </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Categoria *
                    </label>
                    
                    {/* Toggle entre selecionar e criar */}
                    <div className="flex items-center gap-3 mb-3">
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreatingCategory(false)
                          setNewCategoryName('')
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          !isCreatingCategory
                            ? 'bg-primary-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Selecionar Existente
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreatingCategory(true)
                          setFormData({ ...formData, categoryId: '' })
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          isCreatingCategory
                            ? 'bg-primary-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Criar Nova
                      </button>
                  </div>

                    {!isCreatingCategory ? (
                  <select
                    value={formData.categoryId}
                      onChange={(e) =>
                      setFormData({ ...formData, categoryId: e.target.value })
                      }
                      className="input-field"
                      required
                  >
                        <option value="">Selecione uma categoria</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                    ) : (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="Digite o nome da nova categoria"
                          className="input-field"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleCreateCategory()
                            }
                          }}
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleCreateCategory}
                            disabled={isCreatingCategoryLoading || !newCategoryName.trim()}
                            className="btn-primary text-sm py-2 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isCreatingCategoryLoading ? (
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Criando...
                  </div>
                            ) : (
                              'Criar Categoria'
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsCreatingCategory(false)
                              setNewCategoryName('')
                            }}
                            className="btn-secondary text-sm py-2 px-4"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Imagem do Produto
                    </label>
                  <div className="space-y-2">
                    <input
                      type="file"
                      onChange={handleUpload}
                      accept="image/*"
                      className="hidden"
                      id="image-upload"
                      disabled={uploading}
                    />
                    <label
                      htmlFor="image-upload"
                        className="btn-secondary inline-flex items-center gap-2 cursor-pointer w-full justify-center"
                    >
                      <Upload size={20} />
                      {uploading ? 'Enviando...' : 'Upload Imagem'}
                    </label>
                    {formData.imageUrl && (
                        <div className="relative w-32 h-32 bg-gray-100 rounded-lg overflow-hidden">
                        <Image
                          src={formData.imageUrl}
                          alt="Preview"
                          fill
                            sizes="128px"
                          className="object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>

                  <div className="flex items-center gap-6 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isNew}
                      onChange={(e) =>
                        setFormData({ ...formData, isNew: e.target.checked })
                      }
                        className="w-5 h-5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                      <span className="text-sm font-medium text-gray-700">Marcar como Novidade</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) =>
                        setFormData({ ...formData, active: e.target.checked })
                      }
                        className="w-5 h-5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                      <span className="text-sm font-medium text-gray-700">Disponível para Venda</span>
                  </label>
                  </div>
                </div>

                {/* Preços por Condomínio */}
                {condominiums.length > 0 && (
                  <div className="border-t pt-6 mt-6">
                    <div className="mb-4">
                      <h3 className="text-lg font-bold text-gray-900 mb-2">
                        Preços por Condomínio *
                      </h3>
                      <p className="text-sm text-gray-500">
                        Defina o preço para cada condomínio. Produtos sem preço não aparecerão no catálogo daquele condomínio.
                      </p>
                    </div>
                    <div className="space-y-4">
                      {condominiums.map((condominium) => {
                        const priceData = condominiumPrices[condominium.id] || {
                          condominiumId: condominium.id,
                          price: '',
                          promoPrice: '',
                          isPromotion: false,
                          available: true, // Por padrão, disponível
                        }
                        const isAvailable = priceData.available !== false && condominium.active
                        
                        return (
                          <div
                            key={condominium.id}
                            className={`bg-white p-5 rounded-xl border-2 ${
                              isAvailable
                                ? 'border-primary-200 shadow-sm'
                                : 'border-gray-200 opacity-60 bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="font-bold text-gray-900 text-base">
                                {condominium.name}
                              </h4>
                              <div className="flex items-center gap-2">
                                {!condominium.active && (
                                  <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                    INATIVO
                                  </span>
                                )}
                                {condominium.active && (
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={isAvailable}
                                      onChange={(e) => {
                                        const newAvailable = e.target.checked
                                        setCondominiumPrices({
                                          ...condominiumPrices,
                                          [condominium.id]: {
                                            ...priceData,
                                            available: newAvailable,
                                            // Se desmarcar, limpar preços
                                            price: newAvailable ? priceData.price : '',
                                            promoPrice: newAvailable ? priceData.promoPrice : '',
                                            isPromotion: newAvailable ? priceData.isPromotion : false,
                                          },
                                        })
                                      }}
                                      className="w-5 h-5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                    />
                                    <span className="text-sm font-medium text-gray-700">
                                      {isAvailable ? 'Disponível' : 'Indisponível'}
                                    </span>
                                  </label>
                                )}
                              </div>
                            </div>
                            
                            {isAvailable ? (
                              <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                      Preço Normal (R$) *
                  </label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0.01"
                                      value={priceData.price}
                                      onChange={(e) => {
                                        const newPrice = e.target.value
                                        const hasPrice = newPrice.trim() !== '' && !isNaN(parseFloat(newPrice)) && parseFloat(newPrice) > 0
                                        setCondominiumPrices({
                                          ...condominiumPrices,
                                          [condominium.id]: {
                                            ...priceData,
                                            price: newPrice,
                                            available: hasPrice, // Se remover preço, marcar como indisponível
                                            // Se remover preço, limpar promoção também
                                            promoPrice: hasPrice ? priceData.promoPrice : '',
                                            isPromotion: hasPrice ? priceData.isPromotion : false,
                                          },
                                        })
                                      }}
                                      className="input-field"
                                      placeholder="Ex: 3.99"
                                    />
                                  </div>
                                  
                                  <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                      Preço Promoção (R$)
                                    </label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0.01"
                                      value={priceData.promoPrice}
                    onChange={(e) =>
                                        setCondominiumPrices({
                                          ...condominiumPrices,
                                          [condominium.id]: {
                                            ...priceData,
                                            promoPrice: e.target.value,
                                          },
                                        })
                    }
                    className="input-field"
                                      placeholder="Opcional"
                                    />
                                  </div>
                </div>

                                <div className="mt-4">
                                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                                      type="checkbox"
                                      checked={priceData.isPromotion}
                                      onChange={(e) =>
                                        setCondominiumPrices({
                                          ...condominiumPrices,
                                          [condominium.id]: {
                                            ...priceData,
                                            isPromotion: e.target.checked,
                                          },
                                        })
                                      }
                                      className="w-5 h-5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                      disabled={!priceData.promoPrice}
                                    />
                                    <span className="text-sm font-medium text-gray-700">
                                      Ativar promoção
                                    </span>
                    </label>
                                  {priceData.isPromotion && !priceData.promoPrice && (
                                    <p className="text-xs text-red-500 mt-1">
                                      Defina um preço de promoção para ativar o badge
                                    </p>
                                  )}
                                </div>
                              </>
                            ) : (
                              <div className="bg-gray-100 p-4 rounded-lg text-center">
                                <p className="text-sm text-gray-600 font-medium">
                                  Produto indisponível para este condomínio
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  Este produto não aparecerá no catálogo deste condomínio
                                </p>
                      </div>
                    )}
                  </div>
                        )
                      })}
                </div>
                  </div>
                )}

                <div className="flex gap-3 pt-6 border-t">
                  <button type="submit" className="btn-primary flex-1" disabled={isSaving}>
                    {isSaving ? (
                      <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                    ) : (
                      editingProduct ? 'Atualizar' : 'Criar'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      resetForm()
                    }}
                    className="btn-secondary flex-1"
                    disabled={isSaving}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

