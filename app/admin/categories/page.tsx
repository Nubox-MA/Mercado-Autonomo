'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import axios from 'axios'
import { Plus, Edit, Trash2, X, Check, Package, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import ConfirmModal from '@/components/ConfirmModal'

interface Category {
  id: string
  name: string
  description?: string
  _count: {
    products: number
  }
}

interface Product {
  id: string
  name: string
  price: number
  stock: number
  categoryId?: string
}

interface CategoryWithProducts extends Category {
  products?: Product[]
}

export default function CategoriesPage() {
  const { token } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedCategory, setSelectedCategory] = useState<CategoryWithProducts | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [isAddingProducts, setIsAddingProducts] = useState(false)
  const [showProductsSection, setShowProductsSection] = useState(false)
  const [showAddProductsModal, setShowAddProductsModal] = useState<Category | null>(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [productSearchQuery, setProductSearchQuery] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })

  useEffect(() => {
    fetchCategories()
    fetchProducts()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/categories')
      setCategories(response.data.categories)
    } catch (error) {
      console.error('Error fetching categories:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/api/products')
      setProducts(response.data.products || [])
      console.log('Produtos carregados:', response.data.products?.length || 0)
      const withoutCategory = (response.data.products || []).filter((p: Product) => !p.categoryId)
      console.log('Produtos sem categoria:', withoutCategory.length)
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setIsSaving(true)
      if (editingCategory) {
        // Atualizar categoria
        await axios.put(`/api/categories/${editingCategory.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        })
        toast.success('Categoria atualizada!')
      } else {
        // Criar categoria
        await axios.post('/api/categories', formData, {
          headers: { Authorization: `Bearer ${token}` },
        })
        toast.success('Categoria criada!')
      }
      setShowModal(false)
      resetForm()
      fetchCategories()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao salvar categoria')
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      description: category.description || '',
    })
    setShowModal(true)
  }

  const handleDelete = async () => {
    if (!deletingCategory) return

    try {
      setIsDeleting(true)
      await axios.delete(`/api/categories/${deletingCategory.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      toast.success('Categoria deletada!')
      setDeletingCategory(null)
      fetchCategories()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao deletar categoria')
    } finally {
      setIsDeleting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
    })
    setEditingCategory(null)
    setSelectedProductIds([])
    setShowProductsSection(false)
    setShowAddProductsModal(null)
  }

  // Obter produtos sem categoria (para exibição no card)
  const productsWithoutCategory = products.filter((p) => !p.categoryId || p.categoryId === null)

  // Obter produtos que NÃO estão na categoria selecionada
  const getAvailableProducts = () => {
    if (!showAddProductsModal) return products
    // Filtrar produtos que já estão nesta categoria
    return products.filter((p) => p.categoryId !== showAddProductsModal.id)
  }

  const availableProducts = getAvailableProducts()

  // Filtrar produtos pela busca
  const filteredProducts = availableProducts.filter((product) => {
    if (!productSearchQuery) return true
    const query = productSearchQuery.toLowerCase()
    const productCategory = categories.find(c => c.id === product.categoryId)
    return (
      product.name.toLowerCase().includes(query) ||
      (productCategory && productCategory.name.toLowerCase().includes(query))
    )
  })

  // Função para alternar seleção de produto
  const toggleProductSelection = (productId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    )
  }

  // Função para adicionar produtos selecionados à categoria
  const handleAddProductsToCategory = async (categoryId?: string) => {
    const targetCategoryId = categoryId || editingCategory?.id
    if (!targetCategoryId || selectedProductIds.length === 0) {
      toast.error('Selecione pelo menos um produto')
      return
    }

    try {
      setIsAddingProducts(true)
      await axios.post(
        '/api/products/bulk-update-category',
        {
          productIds: selectedProductIds,
          categoryId: targetCategoryId,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      toast.success(`${selectedProductIds.length} produto(s) adicionado(s) à categoria!`)
      setSelectedProductIds([])
      setShowAddProductsModal(null)
      fetchProducts()
      fetchCategories()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao adicionar produtos à categoria')
    } finally {
      setIsAddingProducts(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Categorias</h1>
        <button
          onClick={() => {
            resetForm()
            setShowModal(true)
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          Nova Categoria
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <div key={category.id} className="card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-lg">{category.name}</h3>
                <span className="bg-primary-100 text-primary-800 px-2 py-1 rounded-full text-xs font-medium">
                  {category._count.products}
                </span>
              </div>
              
              {category.description && (
                <p className="text-gray-600 text-sm mb-3">
                  {category.description}
                </p>
              )}
              
              <div className="space-y-2 mt-4">
                <div className="flex gap-2">
                  {category._count.products > 0 && (
                    <button
                      onClick={() => {
                        const categoryProducts = products.filter(
                          (p) => p.categoryId === category.id
                        )
                        setSelectedCategory({
                          ...category,
                          products: categoryProducts,
                        })
                      }}
                      className="flex-1 text-primary-600 hover:text-primary-700 text-sm font-medium py-2 border border-primary-200 rounded hover:bg-primary-50 transition"
                    >
                      Ver {category._count.products} produtos →
                    </button>
                  )}
                  <button
                  onClick={() => {
                    setSelectedProductIds([])
                    setProductSearchQuery('')
                    setShowAddProductsModal(category)
                  }}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-3 rounded transition flex items-center justify-center gap-2"
                    title={`Adicionar produtos à categoria ${category.name}`}
                  >
                    <Package size={16} />
                    Adicionar Produtos
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(category)}
                    className="flex-1 text-blue-600 hover:text-blue-800 py-2 px-3 border border-blue-200 rounded hover:bg-blue-50 transition flex items-center justify-center gap-1"
                    title="Editar categoria"
                  >
                    <Edit size={16} />
                    Editar
                  </button>
                  <button
                    onClick={() => setDeletingCategory(category)}
                    className="flex-1 text-red-600 hover:text-red-800 py-2 px-3 border border-red-200 rounded hover:bg-red-50 transition flex items-center justify-center gap-1"
                    title="Excluir categoria"
                    disabled={category._count.products > 0}
                  >
                    <Trash2 size={16} />
                    Excluir
                  </button>
                </div>
              </div>
              {category._count.products > 0 && (
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Não é possível excluir categoria com produtos
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal de Criar/Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">
                  {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false)
                    resetForm()
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nome *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Descrição
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="input-field"
                    rows={3}
                  />
                </div>

                {/* Seção de Adicionar Produtos (apenas ao editar) */}
                {editingCategory && productsWithoutCategory.length > 0 && (
                  <div className="border-t pt-4 mt-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-lg">Adicionar Produtos à Categoria</h3>
                        <p className="text-sm text-gray-600">
                          {productsWithoutCategory.length} produto(s) sem categoria disponível(is)
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowProductsSection(!showProductsSection)}
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                      >
                        {showProductsSection ? 'Ocultar' : 'Mostrar'}
                      </button>
                    </div>

                    {showProductsSection && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedProductIds.length === productsWithoutCategory.length && productsWithoutCategory.length > 0}
                              onChange={toggleSelectAll}
                              className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            />
                            <span className="text-sm font-medium text-gray-700">
                              Selecionar todos ({productsWithoutCategory.length})
                            </span>
                          </label>
                          {selectedProductIds.length > 0 && (
                            <span className="text-sm text-primary-600 font-medium">
                              {selectedProductIds.length} selecionado(s)
                            </span>
                          )}
                        </div>

                        <div className="max-h-60 overflow-y-auto border rounded-lg p-3 space-y-2">
                          {productsWithoutCategory.map((product) => (
                            <label
                              key={product.id}
                              className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedProductIds.includes(product.id)}
                                onChange={() => toggleProductSelection(product.id)}
                                className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                              />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{product.name}</p>
                                <p className="text-xs text-gray-500">
                                  {new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL',
                                  }).format(product.price)}
                                </p>
                              </div>
                            </label>
                          ))}
                        </div>

                        {selectedProductIds.length > 0 && (
                          <button
                            type="button"
                            onClick={() => handleAddProductsToCategory()}
                            disabled={isAddingProducts}
                            className="w-full btn-primary flex items-center justify-center gap-2"
                          >
                            {isAddingProducts ? (
                              <>
                                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Adicionando...
                              </>
                            ) : (
                              <>
                                <Check size={18} />
                                Adicionar {selectedProductIds.length} produto(s) à categoria
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button type="submit" className="btn-primary flex-1" disabled={isSaving}>
                    {isSaving ? (
                      <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                    ) : (
                      editingCategory ? 'Atualizar' : 'Criar'
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

      {/* Modal de Confirmação de Exclusão */}
      <ConfirmModal
        isOpen={!!deletingCategory}
        onClose={() => setDeletingCategory(null)}
        onConfirm={handleDelete}
        title="Excluir Categoria?"
        message={
          deletingCategory
            ? `Tem certeza que deseja excluir a categoria "${deletingCategory.name}"? Esta ação não pode ser desfeita.`
            : ''
        }
        confirmText="Sim, Excluir"
        cancelText="Cancelar"
        type="danger"
        isLoading={isDeleting}
      />

      {/* Modal de Adicionar Produtos à Categoria */}
      {showAddProductsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold">Adicionar Produtos à Categoria</h2>
                  <p className="text-gray-600 mt-1">
                    {showAddProductsModal.name} - {availableProducts.length} produto(s) disponível(is) (produtos já nesta categoria não são exibidos)
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowAddProductsModal(null)
                    setSelectedProductIds([])
                    setProductSearchQuery('')
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Barra de Pesquisa */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Pesquisar produto por nome ou categoria..."
                    value={productSearchQuery}
                    onChange={(e) => setProductSearchQuery(e.target.value)}
                    className="input-field pl-10 pr-10 w-full"
                  />
                  {productSearchQuery && (
                    <button
                      onClick={() => setProductSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedProductIds.length === filteredProducts.length && filteredProducts.length > 0}
                      onChange={() => {
                        if (selectedProductIds.length === filteredProducts.length) {
                          // Desselecionar todos os produtos filtrados
                          const filteredIds = filteredProducts.map(p => p.id)
                          setSelectedProductIds(prev => prev.filter(id => !filteredIds.includes(id)))
                        } else {
                          // Selecionar todos os produtos filtrados
                          const filteredIds = filteredProducts.map(p => p.id)
                          setSelectedProductIds(prev => [...new Set([...prev, ...filteredIds])])
                        }
                      }}
                      className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Selecionar todos ({filteredProducts.length})
                    </span>
                  </label>
                  {selectedProductIds.length > 0 && (
                    <span className="text-sm text-primary-600 font-medium">
                      {selectedProductIds.length} selecionado(s)
                    </span>
                  )}
                </div>

                <div className="max-h-96 overflow-y-auto border rounded-lg p-3 space-y-2">
                  {filteredProducts.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">
                      {productSearchQuery ? 'Nenhum produto encontrado com essa pesquisa' : 'Não há produtos disponíveis para adicionar a esta categoria'}
                    </p>
                  ) : (
                    filteredProducts.map((product) => {
                      const productCategory = categories.find(c => c.id === product.categoryId)
                      return (
                        <label
                          key={product.id}
                          className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedProductIds.includes(product.id)}
                            onChange={() => toggleProductSelection(product.id)}
                            className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{product.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-gray-500">
                                {new Intl.NumberFormat('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL',
                                }).format(product.price)}
                              </p>
                              {productCategory && (
                                <span className="text-xs text-gray-400">
                                  • {productCategory.name}
                                </span>
                              )}
                              {!productCategory && (
                                <span className="text-xs text-gray-400">
                                  • Sem categoria
                                </span>
                              )}
                            </div>
                          </div>
                        </label>
                      )
                    })
                  )}
                </div>

                {/* Botões de Ação - sempre visíveis quando há produtos selecionados */}
                {selectedProductIds.length > 0 && (
                  <div className="sticky bottom-0 bg-white pt-4 border-t mt-4">
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setShowAddProductsModal(null)
                          setSelectedProductIds([])
                          setProductSearchQuery('')
                        }}
                        className="flex-1 bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium py-3 px-4 rounded transition flex items-center justify-center gap-2"
                      >
                        <X size={18} />
                        Cancelar
                      </button>
                      <button
                        onClick={() => setShowPreviewModal(true)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-3 px-4 rounded transition flex items-center justify-center gap-2"
                      >
                        <Package size={18} />
                        Preview dos produtos selecionados ({selectedProductIds.length})
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Preview dos Produtos Selecionados */}
      {showPreviewModal && showAddProductsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold">Preview dos Produtos Selecionados</h2>
                  <p className="text-gray-600 mt-1">
                    {selectedProductIds.length} produto(s) serão adicionados à categoria <strong>{showAddProductsModal.name}</strong>
                  </p>
                </div>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="max-h-96 overflow-y-auto border rounded-lg p-3 space-y-2">
                  {selectedProductIds.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">
                      Nenhum produto selecionado
                    </p>
                  ) : (
                    availableProducts
                      .filter((p) => selectedProductIds.includes(p.id))
                      .map((product) => {
                        const productCategory = categories.find(c => c.id === product.categoryId)
                        return (
                          <div
                            key={product.id}
                            className="flex items-center gap-3 p-3 bg-gray-50 rounded border"
                          >
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{product.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-xs text-gray-500">
                                  {new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL',
                                  }).format(product.price)}
                                </p>
                                {productCategory && (
                                  <span className="text-xs text-gray-400">
                                    • Categoria atual: {productCategory.name}
                                  </span>
                                )}
                                {!productCategory && (
                                  <span className="text-xs text-gray-400">
                                    • Sem categoria
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => toggleProductSelection(product.id)}
                              className="text-red-600 hover:text-red-800 p-1"
                              title="Remover da seleção"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        )
                      })
                  )}
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  <button
                    onClick={() => setShowPreviewModal(false)}
                    className="flex-1 btn-secondary"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={() => {
                      setShowPreviewModal(false)
                      handleAddProductsToCategory(showAddProductsModal.id)
                    }}
                    disabled={isAddingProducts || selectedProductIds.length === 0}
                    className="flex-1 btn-primary flex items-center justify-center gap-2"
                  >
                    {isAddingProducts ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Adicionando...
                      </>
                    ) : (
                      <>
                        <Check size={18} />
                        Adicionar {selectedProductIds.length} produto(s) à categoria
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Produtos da Categoria */}
      {selectedCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">{selectedCategory.name}</h2>
                  <p className="text-gray-600">{selectedCategory.products?.length} produtos nesta categoria</p>
                </div>
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="text-gray-500 hover:text-gray-700 text-3xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-3">
                {selectedCategory.products?.map((product) => (
                  <div key={product.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{product.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Estoque: <span className={`font-medium ${product.stock < 10 ? 'text-red-600' : 'text-green-600'}`}>
                            {product.stock} unid.
                          </span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-primary-600">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(product.price)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {(!selectedCategory.products || selectedCategory.products.length === 0) && (
                  <p className="text-center text-gray-500 py-8">
                    Nenhum produto cadastrado nesta categoria
                  </p>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="btn-secondary"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
