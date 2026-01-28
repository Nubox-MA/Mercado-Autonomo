'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import axios from 'axios'
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle, Edit2, Save, X } from 'lucide-react'
import toast from 'react-hot-toast'

interface Condominium {
  id: string
  name: string
  active: boolean
}

interface Category {
  id: string
  name: string
}

interface ErrorProduct {
  line: number
  error: string
  data: {
    categoria: string
    marca: string
    subcategoria: string
    descricao: string
    valorStr: string
    situacao: string
  }
}

export default function ImportPage() {
  const { token } = useAuth()
  const [condominiums, setCondominiums] = useState<Condominium[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCondominiums, setSelectedCondominiums] = useState<string[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)
  const [isPreview, setIsPreview] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [correctingErrors, setCorrectingErrors] = useState(false)
  const [correctedProducts, setCorrectedProducts] = useState<any[]>([])
  const [editingErrorProduct, setEditingErrorProduct] = useState<ErrorProduct | null>(null)
  const [productCategoryMap, setProductCategoryMap] = useState<Record<number, string>>({})

  useEffect(() => {
    fetchCondominiums()
    fetchCategories()
  }, [])

  const fetchCondominiums = async () => {
    try {
      const response = await axios.get('/api/admin/neighborhoods')
      const active = response.data.filter((c: Condominium) => c.active)
      setCondominiums(active)
      setSelectedCondominiums(active.map((c: Condominium) => c.id))
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      const ext = selectedFile.name.split('.').pop()?.toLowerCase()
      if (ext !== 'xlsx' && ext !== 'xls') {
        toast.error('Apenas arquivos Excel (.xlsx ou .xls) são permitidos')
        return
      }
      setFile(selectedFile)
      setImportResult(null)
      setCorrectedProducts([])
      setProductCategoryMap({})
    }
  }

  const handlePreview = async () => {
    if (!file) {
      toast.error('Selecione um arquivo Excel')
      return
    }

    if (selectedCondominiums.length === 0) {
      toast.error('Selecione pelo menos um condomínio')
      return
    }

    try {
      setUploading(true)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('condominiums', JSON.stringify(selectedCondominiums))
      formData.append('confirm', 'false')
      
      const columnMapping = {
        categoria: 'categoria',
        marca: 'marca',
        subcategoria: 'subcategoria',
        descricao: 'descrição',
        valor: 'valor final',
        situacao: 'situação',
      }
      formData.append('columnMapping', JSON.stringify(columnMapping))

      const response = await axios.post('/api/admin/import', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      })

      setImportResult(response.data.results)
      setIsPreview(response.data.isPreview || false)
      toast.success(response.data.message)
    } catch (error: any) {
      console.error('Preview error:', error)
      toast.error(error.response?.data?.error || 'Erro ao processar arquivo')
    } finally {
      setUploading(false)
    }
  }

  const handleConfirmImport = async () => {
    if (!file) {
      toast.error('Arquivo não encontrado')
      return
    }

    try {
      setConfirming(true)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('condominiums', JSON.stringify(selectedCondominiums))
      formData.append('confirm', 'true')
      
      const columnMapping = {
        categoria: 'categoria',
        marca: 'marca',
        subcategoria: 'subcategoria',
        descricao: 'descrição',
        valor: 'valor final',
        situacao: 'situação',
      }
      formData.append('columnMapping', JSON.stringify(columnMapping))

      console.log('Enviando importação...', {
        condominiums: selectedCondominiums,
        fileName: file.name,
      })

      const response = await axios.post('/api/admin/import', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        timeout: 300000, // 5 minutos de timeout
      })

      console.log('Resposta da importação:', response.data)

      setImportResult(response.data.results)
      setIsPreview(false)
      
      const message = response.data.message || 'Importação concluída'
      toast.success(message)
      
      // Não limpar o arquivo e resultado imediatamente para o usuário ver o resultado
      // setFile(null)
      // const fileInput = document.getElementById('excel-file') as HTMLInputElement
      // if (fileInput) fileInput.value = ''
      // setImportResult(null)
      setCorrectedProducts([])
      setProductCategoryMap({})
    } catch (error: any) {
      console.error('Erro completo na importação:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack,
      })
      
      const errorMessage = error.response?.data?.error || 
                           error.response?.data?.details ||
                           error.message || 
                           'Erro ao confirmar importação'
      
      toast.error(`Erro: ${errorMessage}`, {
        duration: 5000,
      })
      
      // Mostrar detalhes no console
      if (error.response?.data) {
        console.error('Detalhes do erro:', error.response.data)
      }
    } finally {
      setConfirming(false)
    }
  }

  const handleCorrectError = (errorProduct: ErrorProduct) => {
    setEditingErrorProduct(errorProduct)
  }

  const handleSaveCorrectedProduct = () => {
    if (!editingErrorProduct) return

    const data = editingErrorProduct.data
    const categoria = data.categoria || productCategoryMap[editingErrorProduct.line] || ''
    const valorStr = data.valorStr || '0'
    const valor = parseFloat(valorStr.replace(',', '.'))

    if (!categoria || !valor || isNaN(valor) || valor <= 0) {
      toast.error('Categoria e Valor Final são obrigatórios')
      return
    }

    // Nome do produto = Descrição (obrigatório)
    const productName = data.descricao || categoria // Se não tiver descrição, usar categoria como fallback
    
    if (!productName || !productName.trim()) {
      toast.error('Descrição é obrigatória (será usada como nome do produto)')
      return
    }

    const active = data.situacao === 'ativo' || data.situacao === 'disponível' || !data.situacao

    const correctedProduct = {
      name: productName,
      description: null, // Descrição sempre null na aplicação
      price: valor,
      category: categoria,
      active,
      condominiums: condominiums.filter(c => selectedCondominiums.includes(c.id)).map(c => c.name),
    }

    setCorrectedProducts([...correctedProducts, correctedProduct])
    setEditingErrorProduct(null)
    toast.success('Produto corrigido! Será adicionado ao importar.')
  }

  const handleAddCorrectedProducts = async () => {
    if (correctedProducts.length === 0) {
      toast.error('Nenhum produto corrigido para adicionar')
      return
    }

    try {
      setConfirming(true)
      
      // Criar produtos corrigidos
      for (const product of correctedProducts) {
        // Buscar ou criar categoria
        let category = categories.find(c => c.name.toLowerCase() === product.category.toLowerCase())
        
        if (!category) {
          const response = await axios.post('/api/categories', { name: product.category }, {
            headers: { Authorization: `Bearer ${token}` },
          })
          category = response.data.category
          if (category) {
            setCategories([...categories, category])
          }
        }

        // Verificar se category foi definida
        if (!category) {
          throw new Error(`Categoria "${product.category}" não pôde ser criada`)
        }

        // Criar produto com preços por condomínio
        await axios.post('/api/products', {
          name: product.name,
          description: product.description,
          price: product.price,
          categoryId: category.id,
          active: product.active,
          stock: 0,
          condominiumPrices: selectedCondominiums.map((condId) => ({
            neighborhoodId: condId,
            price: product.price,
            promoPrice: null,
            isPromotion: false,
            stock: 0,
          })),
        }, {
          headers: { Authorization: `Bearer ${token}` },
        })
      }

      toast.success(`${correctedProducts.length} produtos corrigidos foram adicionados!`)
      setCorrectedProducts([])
      
      // Remover produtos corrigidos da lista de erros
      if (importResult?.errorProducts) {
        const correctedLines = correctedProducts.map((_, idx) => {
          const errorProduct = importResult.errorProducts.find((ep: ErrorProduct) => 
            ep.line === editingErrorProduct?.line
          )
          return errorProduct?.line
        }).filter(Boolean)
        
        setImportResult({
          ...importResult,
          errorProducts: importResult.errorProducts.filter((ep: ErrorProduct) => 
            !correctedLines.includes(ep.line)
          ),
          errors: importResult.errors - correctedProducts.length,
        })
      }
    } catch (error: any) {
      console.error('Add corrected products error:', error)
      toast.error(error.response?.data?.error || 'Erro ao adicionar produtos corrigidos')
    } finally {
      setConfirming(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Importar Produtos do Excel</h1>
        <p className="text-gray-600 mt-1">
          Faça upload de um arquivo Excel com os produtos para importação em massa
        </p>
      </div>

      <div className="card space-y-6">
        {/* Instruções */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
            <AlertCircle size={20} />
            Formato do Arquivo Excel
          </h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Colunas obrigatórias: <strong>Descrição</strong> (será usada como nome do produto), <strong>Categoria</strong> e <strong>Valor Final</strong></li>
            <li>Colunas opcionais: <strong>Marca</strong>, <strong>Subcategoria</strong>, <strong>Situação</strong></li>
            <li>A primeira linha deve conter os cabeçalhos das colunas</li>
            <li>Valores devem usar ponto (.) ou vírgula (,) como separador decimal</li>
            <li>Situação: &quot;ativo&quot; ou &quot;disponível&quot; = produto ativo, outros = inativo</li>
            <li><strong>Importante:</strong> A Descrição do Excel será usada como Nome do Produto. O campo Descrição na aplicação ficará vazio.</li>
          </ul>
        </div>

        {/* Seleção de Condomínios */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-3">
            Selecione os Condomínios para Importar *
          </label>
          <div className="space-y-2">
            {condominiums.map((cond) => (
              <label key={cond.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedCondominiums.includes(cond.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedCondominiums([...selectedCondominiums, cond.id])
                    } else {
                      setSelectedCondominiums(selectedCondominiums.filter((id) => id !== cond.id))
                    }
                  }}
                  className="w-5 h-5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="text-sm font-medium text-gray-700">{cond.name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Upload de Arquivo */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Arquivo Excel *
          </label>
          <div className="flex items-center gap-4">
            <input
              type="file"
              id="excel-file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
              disabled={uploading}
            />
            <label
              htmlFor="excel-file"
              className="btn-secondary inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <FileSpreadsheet size={20} />
              {file ? file.name : 'Selecionar Arquivo Excel'}
            </label>
            {file && (
              <button
                onClick={() => {
                  setFile(null)
                  const fileInput = document.getElementById('excel-file') as HTMLInputElement
                  if (fileInput) fileInput.value = ''
                }}
                className="text-red-600 hover:text-red-800 text-sm font-medium"
              >
                Remover
              </button>
            )}
          </div>
        </div>

        {/* Botão de Preview */}
        <div>
          <button
            onClick={handlePreview}
            disabled={!file || selectedCondominiums.length === 0 || uploading || confirming}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Analisando arquivo...
              </>
            ) : (
              <>
                <FileSpreadsheet size={20} />
                Analisar Arquivo (Preview)
              </>
            )}
          </button>
        </div>

        {/* Resultado da Importação */}
        {importResult && (
          <div className="border-t pt-6 mt-6">
            <h3 className="font-bold text-lg mb-4">
              {isPreview ? 'Preview da Importação' : 'Resultado da Importação'}
            </h3>
            
            {isPreview && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800 font-medium">
                  ⚠️ <strong>Preview:</strong> Nenhum produto foi adicionado ainda. Revise os dados abaixo e clique em &quot;Confirmar e Adicionar ao Catálogo&quot; para finalizar a importação.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-700 mb-1">
                  <CheckCircle size={20} />
                  <span className="font-bold">{isPreview ? 'Prontos' : 'Criados'}</span>
                </div>
                <p className="text-2xl font-black text-green-600">
                  {isPreview ? importResult.preview?.length || 0 : importResult.success}
                </p>
                <p className="text-sm text-green-600">
                  {isPreview ? 'produtos prontos para importar' : 'produtos criados'}
                </p>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-orange-700 mb-1">
                  <AlertCircle size={20} />
                  <span className="font-bold">Já Existem</span>
                </div>
                <p className="text-2xl font-black text-orange-600">{importResult.skipped || 0}</p>
                <p className="text-sm text-orange-600">preços serão adicionados</p>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-700 mb-1">
                  <XCircle size={20} />
                  <span className="font-bold">Erros</span>
                </div>
                <p className="text-2xl font-black text-red-600">{importResult.errors}</p>
                <p className="text-sm text-red-600">
                  {isPreview ? 'linhas com erro (não serão adicionadas)' : 'linhas com erro'}
                </p>
              </div>
            </div>

            {/* Botão de Confirmação (apenas no preview) */}
            {isPreview && (
              <div className="mb-4 flex gap-3">
                <button
                  onClick={handleConfirmImport}
                  disabled={confirming || (importResult.preview?.length || 0) === 0}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-green-600 hover:bg-green-700"
                >
                  {confirming ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Adicionando ao catálogo...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={20} />
                      Confirmar e Adicionar ao Catálogo
                    </>
                  )}
                </button>
                {importResult.errorProducts && importResult.errorProducts.length > 0 && (
                  <button
                    onClick={() => setCorrectingErrors(!correctingErrors)}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <Edit2 size={20} />
                    {correctingErrors ? 'Ocultar Correções' : 'Corrigir Erros'}
                  </button>
                )}
              </div>
            )}

            {/* Produtos Corrigidos */}
            {correctedProducts.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-green-900">
                    ✅ {correctedProducts.length} produto(s) corrigido(s) e pronto(s) para adicionar:
                  </p>
                  <button
                    onClick={handleAddCorrectedProducts}
                    disabled={confirming}
                    className="btn-primary text-sm flex items-center gap-2"
                  >
                    <Save size={16} />
                    Adicionar Corrigidos
                  </button>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {correctedProducts.map((product, idx) => (
                    <div key={idx} className="bg-white p-2 rounded text-sm">
                      <p className="font-semibold">{product.name}</p>
                      <p className="text-gray-600">Categoria: {product.category} | Preço: {formatPrice(product.price)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {importResult.skippedList && importResult.skippedList.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                <p className="text-sm font-bold text-orange-900 mb-2">
                  ⚠️ Produtos que já existem (preços serão adicionados para condomínios selecionados):
                </p>
                <ul className="text-xs text-orange-800 space-y-1 max-h-40 overflow-y-auto">
                  {importResult.skippedList.slice(0, 20).map((item: string, idx: number) => (
                    <li key={idx} className="list-disc list-inside">{item}</li>
                  ))}
                  {importResult.skippedList.length > 20 && (
                    <li className="text-orange-600 font-medium">
                      ... e mais {importResult.skippedList.length - 20} produtos existentes
                    </li>
                  )}
                </ul>
              </div>
            )}

            {importResult.createdCategories && importResult.createdCategories.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm font-bold text-blue-900 mb-2">
                  {isPreview ? 'Categorias que serão criadas:' : 'Categorias criadas automaticamente:'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {importResult.createdCategories.map((cat: string, idx: number) => (
                    <span
                      key={idx}
                      className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Produtos com Erro - Interface de Correção */}
            {correctingErrors && importResult.errorProducts && importResult.errorProducts.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-sm font-bold text-red-900 mb-3">
                  ❌ Produtos com Erro - Corrigir e Adicionar:
                </p>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {importResult.errorProducts.map((errorProduct: ErrorProduct, idx: number) => (
                    <div key={idx} className="bg-white p-3 rounded border border-red-200">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-red-700 mb-1">
                            Linha {errorProduct.line}: {errorProduct.error}
                          </p>
                          <div className="text-xs text-gray-600 space-y-1">
                            {errorProduct.data.marca && <p>Marca: {errorProduct.data.marca}</p>}
                            {errorProduct.data.subcategoria && <p>Subcategoria: {errorProduct.data.subcategoria}</p>}
                            {errorProduct.data.descricao && <p>Descrição: {errorProduct.data.descricao}</p>}
                            {errorProduct.data.valorStr && <p>Valor: {errorProduct.data.valorStr}</p>}
                          </div>
                        </div>
                        <button
                          onClick={() => handleCorrectError(errorProduct)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                        >
                          <Edit2 size={16} />
                        </button>
                      </div>
                      {!errorProduct.data.categoria && (
                        <div className="mt-2">
                          <label className="text-xs font-medium text-gray-700 mb-1 block">
                            Selecionar Categoria:
                          </label>
                          <select
                            value={productCategoryMap[errorProduct.line] || ''}
                            onChange={(e) => {
                              setProductCategoryMap({
                                ...productCategoryMap,
                                [errorProduct.line]: e.target.value,
                              })
                            }}
                            className="input-field text-sm py-1"
                          >
                            <option value="">Selecione uma categoria</option>
                            {categories.map((cat) => (
                              <option key={cat.id} value={cat.name}>
                                {cat.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {importResult.errorsList && importResult.errorsList.length > 0 && !correctingErrors && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-sm font-bold text-red-900 mb-2">
                  ❌ Erros Encontrados (estas linhas NÃO serão adicionadas):
                </p>
                <ul className="text-xs text-red-800 space-y-1 max-h-40 overflow-y-auto">
                  {importResult.errorsList.slice(0, 20).map((error: string, idx: number) => (
                    <li key={idx} className="list-disc list-inside">{error}</li>
                  ))}
                  {importResult.errorsList.length > 20 && (
                    <li className="text-red-600 font-medium">
                      ... e mais {importResult.errorsList.length - 20} erros
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Preview de produtos melhorado */}
            {isPreview && importResult.preview && importResult.preview.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm font-bold text-gray-900 mb-3">
                  📋 Produtos que serão criados (mostrando primeiros 5):
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {importResult.preview.slice(0, 5).map((item: any, idx: number) => (
                    <div key={idx} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                      <p className="font-bold text-gray-900 mb-1">{item.name}</p>
                      <div className="space-y-1 text-sm">
                        <p className="text-gray-700">
                          <span className="font-semibold">Categoria:</span> {item.category || 'Sem categoria'}
                        </p>
                        <p className="text-gray-700">
                          <span className="font-semibold">Preço:</span> {formatPrice(item.price)}
                        </p>
                        {item.description && (
                          <p className="text-gray-600 text-xs mt-1">{item.description}</p>
                        )}
                        <p className="text-gray-500 text-xs mt-1">
                          Condomínios: {item.condominiums?.join(', ') || 'Nenhum'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                {importResult.preview.length > 5 && (
                  <p className="text-xs text-gray-500 italic mt-3 text-center">
                    ... e mais {importResult.preview.length - 5} produtos
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Modal de Correção de Produto */}
        {editingErrorProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">Corrigir Produto</h2>
                  <button
                    onClick={() => setEditingErrorProduct(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X size={24} />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Descrição (Nome do Produto) *
                    </label>
                    <textarea
                      value={editingErrorProduct.data.descricao}
                      onChange={(e) => {
                        setEditingErrorProduct({
                          ...editingErrorProduct,
                          data: { ...editingErrorProduct.data, descricao: e.target.value },
                        })
                      }}
                      className="input-field"
                      rows={3}
                      placeholder="Esta descrição será usada como nome do produto"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      A descrição do Excel será usada como nome do produto na aplicação
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Categoria *</label>
                    <select
                      value={editingErrorProduct.data.categoria || productCategoryMap[editingErrorProduct.line] || ''}
                      onChange={(e) => {
                        setEditingErrorProduct({
                          ...editingErrorProduct,
                          data: { ...editingErrorProduct.data, categoria: e.target.value },
                        })
                      }}
                      className="input-field"
                      required
                    >
                      <option value="">Selecione uma categoria</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Valor Final *</label>
                    <input
                      type="text"
                      value={editingErrorProduct.data.valorStr}
                      onChange={(e) => {
                        setEditingErrorProduct({
                          ...editingErrorProduct,
                          data: { ...editingErrorProduct.data, valorStr: e.target.value },
                        })
                      }}
                      placeholder="0.00"
                      className="input-field"
                      required
                    />
                  </div>

                  <div className="bg-gray-50 p-3 rounded text-xs text-gray-600">
                    <p className="font-semibold mb-1">Nota:</p>
                    <p>Marca e Subcategoria não são mais usadas. A Descrição será o nome do produto.</p>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleSaveCorrectedProduct}
                    className="btn-primary flex-1"
                  >
                    Salvar Correção
                  </button>
                  <button
                    onClick={() => setEditingErrorProduct(null)}
                    className="btn-secondary flex-1"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
