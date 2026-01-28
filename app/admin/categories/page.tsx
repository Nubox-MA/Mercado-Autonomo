'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import axios from 'axios'
import { Plus, Edit, Trash2, X } from 'lucide-react'
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
      setProducts(response.data.products)
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
              
              <div className="flex gap-2 mt-4">
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
                  onClick={() => handleEdit(category)}
                  className="text-blue-600 hover:text-blue-800 p-2 border border-blue-200 rounded hover:bg-blue-50 transition"
                  title="Editar categoria"
                >
                  <Edit size={18} />
                </button>
                <button
                  onClick={() => setDeletingCategory(category)}
                  className="text-red-600 hover:text-red-800 p-2 border border-red-200 rounded hover:bg-red-50 transition"
                  title="Excluir categoria"
                  disabled={category._count.products > 0}
                >
                  <Trash2 size={18} />
                </button>
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
          <div className="bg-white rounded-lg max-w-md w-full">
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
