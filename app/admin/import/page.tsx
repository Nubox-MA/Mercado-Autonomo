'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import axios from 'axios'
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle, Edit2, Save, X, ChevronDown, ChevronUp } from 'lucide-react'
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
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, percentage: 0 })
  const [uploadProgress, setUploadProgress] = useState(0) // Progresso do upload do arquivo
  const [showSkippedList, setShowSkippedList] = useState(false) // Controla exibição da lista de produtos existentes
  const [showErrorsList, setShowErrorsList] = useState(false) // Controla exibição da lista de erros

  useEffect(() => {
    fetchCondominiums()
    fetchCategories()
  }, [])

  // Resetar estados ao desmontar o componente (ao sair da página)
  useEffect(() => {
    return () => {
      // Limpar estados ao sair da página
      setConfirming(false)
      setEditingErrorProduct(null)
      setImportProgress({ current: 0, total: 0, percentage: 0 })
    }
  }, [])

  const fetchCondominiums = async () => {
    try {
      const response = await axios.get('/api/admin/neighborhoods')
      const active = response.data.filter((c: Condominium) => c.active)
      setCondominiums(active)
      // Não selecionar nenhum condomínio inicialmente
      setSelectedCondominiums([])
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
      toast.error('Selecione um condomínio')
      return
    }

    try {
      setUploading(true)
      setUploadProgress(0) // Resetar progresso
      
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
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            // Calcular progresso do upload (primeiros 90%)
            // Os últimos 10% são para processamento no servidor
            const uploadPercent = Math.round((progressEvent.loaded * 90) / progressEvent.total)
            setUploadProgress(uploadPercent)
            console.log(`Upload: ${uploadPercent}% (${progressEvent.loaded}/${progressEvent.total} bytes)`)
          } else if (progressEvent.loaded) {
            // Se não tiver total, usar uma estimativa baseada no loaded
            const estimatedPercent = Math.min(90, Math.round((progressEvent.loaded / (file.size || 1)) * 90))
            setUploadProgress(estimatedPercent)
          }
        },
      })

      // Quando o upload termina, mostrar 90% e simular processamento até 100%
      setUploadProgress(90)
      
      // Simular processamento no servidor (últimos 10%)
      let processingProgress = 90
      const processingInterval = setInterval(() => {
        processingProgress += 1
        if (processingProgress <= 100) {
          setUploadProgress(processingProgress)
        } else {
          clearInterval(processingInterval)
        }
      }, 100) // Atualizar a cada 100ms

      setImportResult(response.data.results)
      setIsPreview(response.data.isPreview || false)
      
      // Quando a resposta chegar, garantir 100%
      clearInterval(processingInterval)
      setUploadProgress(100)
      
      toast.success(response.data.message)
    } catch (error: any) {
      console.error('Preview error:', error)
      toast.error(error.response?.data?.error || 'Erro ao processar arquivo')
      setUploadProgress(0) // Resetar em caso de erro
    } finally {
      setUploading(false)
      // Resetar progresso após 2 segundos
      setTimeout(() => {
        setUploadProgress(0)
      }, 2000)
    }
  }

  const handleConfirmImport = async () => {
    if (!file) {
      toast.error('Arquivo não encontrado')
      return
    }

    let progressInterval: ReturnType<typeof setInterval> | null = null
    
    try {
      setConfirming(true)
      
      // Calcular total estimado de produtos para processar
      const totalToProcess = importResult?.preview?.length || 0
      const totalExisting = importResult?.skipped || 0
      const totalEstimated = totalToProcess + totalExisting
      
      setImportProgress({ current: 0, total: totalEstimated, percentage: 0 })
      
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
        totalEstimated,
      })

      // Simular progresso baseado em estimativa de tempo
      const startTime = Date.now()
      const progressState = { lastProgress: 0 }
      
      progressInterval = setInterval(() => {
        if (totalEstimated > 0) {
          // Estimar progresso baseado em tempo
          // Assumindo ~30-100ms por produto (dependendo se é novo ou existente)
          const elapsed = Date.now() - startTime
          
          // Primeiros 10% são upload do arquivo (já coberto pelo onUploadProgress)
          // Restante é processamento: produtos novos são mais lentos (~80ms), existentes são mais rápidos (~30ms)
          const newProducts = totalToProcess
          const existingProducts = totalExisting
          const estimatedTimeForNew = newProducts * 80 // 80ms por produto novo
          const estimatedTimeForExisting = existingProducts * 30 // 30ms por produto existente
          const totalEstimatedTime = estimatedTimeForNew + estimatedTimeForExisting
          
          // Progresso do upload (primeiros 10%)
          const uploadProgress = Math.min(10, progressState.lastProgress)
          
          // Progresso do processamento (restante 90%)
          const processingElapsed = Math.max(0, elapsed - 1000) // Dar 1s para upload
          const processingProgress = totalEstimatedTime > 0 
            ? Math.min(90, Math.floor((processingElapsed / totalEstimatedTime) * 90))
            : 0
          
          const estimatedProgress = Math.min(95, uploadProgress + processingProgress)
          
          // Garantir que o progresso sempre avance (não retroceda)
          if (estimatedProgress > progressState.lastProgress) {
            progressState.lastProgress = estimatedProgress
            setImportProgress({
              current: Math.floor((estimatedProgress / 100) * totalEstimated),
              total: totalEstimated,
              percentage: estimatedProgress
            })
          }
        }
      }, 300) // Atualizar a cada 300ms para ser mais suave

      const response = await axios.post('/api/admin/import', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        timeout: 300000, // 5 minutos de timeout
        onUploadProgress: (progressEvent) => {
          // Progresso do upload do arquivo
          if (progressEvent.total) {
            const uploadProgress = Math.floor((progressEvent.loaded / progressEvent.total) * 10) // Primeiros 10%
            setImportProgress(prev => ({
              ...prev,
              percentage: uploadProgress,
              current: Math.floor((uploadProgress / 100) * totalEstimated)
            }))
          }
        },
      })

      if (progressInterval) {
        clearInterval(progressInterval)
      }
      
      // Atualizar progresso final
      setImportProgress({ current: totalEstimated, total: totalEstimated, percentage: 100 })

      console.log('Resposta da importação:', response.data)

      setImportResult(response.data.results)
      setIsPreview(false)
      
      const message = response.data.message || 'Importação concluída'
      const successCount = response.data.results?.success || 0
      const skippedCount = response.data.results?.skipped || 0
      
      // Feedback de conclusão mais destacado
      toast.success(
        `✅ Importação Finalizada!\n${successCount} produtos criados | ${skippedCount} preços adicionados`,
        {
          duration: 8000,
          style: {
            background: '#10b981',
            color: '#fff',
            fontSize: '16px',
            padding: '20px',
            borderRadius: '12px',
            fontWeight: 'bold',
          },
        }
      )
      
      // Não limpar o arquivo e resultado imediatamente para o usuário ver o resultado
      // setFile(null)
      // const fileInput = document.getElementById('excel-file') as HTMLInputElement
      // if (fileInput) fileInput.value = ''
      // setImportResult(null)
      setCorrectedProducts([])
      setProductCategoryMap({})
      
      // Resetar progresso após 2 segundos
      setTimeout(() => {
        setImportProgress({ current: 0, total: 0, percentage: 0 })
      }, 2000)
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
      
      // Resetar progresso em caso de erro
      setImportProgress({ current: 0, total: 0, percentage: 0 })
    } finally {
      // Garantir que o intervalo seja limpo mesmo em caso de erro
      if (progressInterval) {
        clearInterval(progressInterval)
      }
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

      const correctedCount = correctedProducts.length
      toast.success(`${correctedCount} produtos corrigidos foram adicionados!`)
      
      // Remover produtos corrigidos da lista de erros ANTES de limpar o estado
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
          errors: importResult.errors - correctedCount,
        })
      }
      
      setCorrectedProducts([])
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

  // Função para resetar todos os estados (emergência)
  const handleResetAll = () => {
    setFile(null)
    setImportResult(null)
    setIsPreview(false)
    setConfirming(false)
    setCorrectingErrors(false)
    setCorrectedProducts([])
    setEditingErrorProduct(null)
    setProductCategoryMap({})
    setImportProgress({ current: 0, total: 0, percentage: 0 })
    if (typeof window !== 'undefined') {
      const fileInput = document.getElementById('excel-file') as HTMLInputElement
      if (fileInput) fileInput.value = ''
    }
    toast.success('Estado resetado')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Importar Produtos do Excel</h1>
          <p className="text-gray-600 mt-1">
            Faça upload de um arquivo Excel com os produtos para importação em massa
          </p>
        </div>
        {(confirming || editingErrorProduct) && (
          <button
            onClick={handleResetAll}
            className="text-sm text-red-600 hover:text-red-800 font-medium px-3 py-1 border border-red-300 rounded hover:bg-red-50"
            title="Resetar tudo (usar se a interface travar)"
          >
            🔄 Resetar
          </button>
        )}
      </div>

      <div className="card space-y-6">
        {/* Instruções - Compacto */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertCircle size={18} className="text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-800">
              <p className="font-semibold mb-1">Formato: <strong>Descrição</strong> (nome do produto), <strong>Categoria</strong>, <strong>Valor Final</strong> | Opcionais: Marca, Subcategoria, Situação</p>
              <p className="text-blue-700">Primeira linha = cabeçalhos | Decimais: ponto ou vírgula | Situação: &quot;ativo&quot;/&quot;disponível&quot; = ativo</p>
            </div>
          </div>
        </div>

        {/* 3 Cards lado a lado: Condomínio | Arquivo | Analisar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Seleção de Condomínio */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <label className="block text-sm font-bold text-gray-700 mb-3">
              Condomínio *
            </label>
            <div className="space-y-2">
              {condominiums.map((cond) => (
                <label key={cond.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="condominium"
                    checked={selectedCondominiums.includes(cond.id)}
                    onChange={() => {
                      setSelectedCondominiums([cond.id])
                    }}
                    className="w-5 h-5 text-primary-600 focus:ring-primary-500 border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">{cond.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Card 2: Upload de Arquivo */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <label className="block text-sm font-bold text-gray-700 mb-3">
              Arquivo Excel *
            </label>
            <div className="space-y-2">
              <input
                type="file"
                id="excel-file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
                disabled={uploading || selectedCondominiums.length === 0}
              />
              <label
                htmlFor="excel-file"
                className={`inline-flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border transition-colors ${
                  selectedCondominiums.length === 0
                    ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
                    : file
                    ? 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100'
                    : 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100'
                }`}
              >
                <FileSpreadsheet size={18} />
                <span className="text-sm font-medium">
                  {file ? file.name : 'Selecionar Arquivo'}
                </span>
              </label>
              {file && (
                <button
                  onClick={() => {
                    setFile(null)
                    setImportResult(null)
                    if (typeof window !== 'undefined') {
                      const fileInput = document.getElementById('excel-file') as HTMLInputElement
                      if (fileInput) fileInput.value = ''
                    }
                  }}
                  className="text-xs text-red-600 hover:text-red-800 font-medium mt-1"
                >
                  ✕ Remover
                </button>
              )}
              {selectedCondominiums.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">Selecione um condomínio primeiro</p>
              )}
            </div>
          </div>

          {/* Card 3: Botão Analisar */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <label className="block text-sm font-bold text-gray-700 mb-3">
              Ação
            </label>
            <div className="space-y-3">
              <button
                onClick={handlePreview}
                disabled={!file || selectedCondominiums.length === 0 || uploading || confirming}
                className={`w-full flex items-center justify-center gap-2 h-10 rounded-lg font-semibold transition-colors ${
                  uploading
                    ? 'bg-green-600 text-white cursor-wait'
                    : !file || selectedCondominiums.length === 0 || confirming
                    ? 'bg-gray-400 text-white cursor-not-allowed opacity-50'
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                }`}
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span className="text-sm font-semibold">Analisando...</span>
                  </>
                ) : (
                  <>
                    <FileSpreadsheet size={18} />
                    <span className="text-sm">Analisar Arquivo</span>
                  </>
                )}
              </button>
              {/* Barra de progresso destacada abaixo do botão */}
              {uploading && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-green-700">Progresso do Upload</span>
                    <span className="font-bold text-green-600">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-green-100 rounded-full h-3 overflow-hidden border border-green-200">
                    <div
                      className="bg-green-600 h-full rounded-full transition-all duration-300 ease-out shadow-sm"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
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
                  ⚠️ <strong>Preview:</strong> Nenhum produto foi adicionado ainda. Revise os dados abaixo, para correções clique em &quot;Corrigir erros&quot; e após &quot;Confirmar e Adicionar&quot; para finalizar a importação dos produtos. Após finalizar, serão informados os produtos que foram adicionados ao catálogo.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              {/* Card 1: Prontos */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-700 mb-1">
                  <CheckCircle size={20} />
                  <span className="font-bold">{isPreview ? 'Prontos' : 'Criados'}</span>
                </div>
                <p className="text-2xl font-black text-green-600">
                  {isPreview ? importResult.preview?.length || 0 : importResult.success}
                </p>
                <p className="text-sm text-green-600">
                  {isPreview ? 'novos produtos prontos para serem adicionados após importação' : 'novos produtos criados'}
                </p>
              </div>

              {/* Card 2: Já Existem */}
              <div 
                className={`bg-orange-50 border border-orange-200 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                  showSkippedList ? 'shadow-md' : ''
                }`}
                onClick={() => setShowSkippedList(!showSkippedList)}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 text-orange-700">
                    <AlertCircle size={20} />
                    <span className="font-bold">Já Existem</span>
                  </div>
                  {importResult.skippedList && importResult.skippedList.length > 0 && (
                    showSkippedList ? <ChevronUp size={18} className="text-orange-600" /> : <ChevronDown size={18} className="text-orange-600" />
                  )}
                </div>
                <p className="text-2xl font-black text-orange-600">{importResult.skipped || 0}</p>
                <p className="text-sm text-orange-600">Produtos existentes, preços diferentes serão atualizados</p>
                {importResult.skippedList && importResult.skippedList.length > 0 && (
                  <p className="text-xs text-orange-500 mt-1">Clique para ver detalhes</p>
                )}
              </div>

              {/* Card 3: Erros */}
              <div 
                className={`bg-red-50 border border-red-200 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                  showErrorsList ? 'shadow-md' : ''
                }`}
                onClick={() => setShowErrorsList(!showErrorsList)}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 text-red-700">
                    <XCircle size={20} />
                    <span className="font-bold">Erros</span>
                  </div>
                  {importResult.errorsList && importResult.errorsList.length > 0 && (
                    showErrorsList ? <ChevronUp size={18} className="text-red-600" /> : <ChevronDown size={18} className="text-red-600" />
                  )}
                </div>
                <p className="text-2xl font-black text-red-600">{importResult.errors}</p>
                <p className="text-sm text-red-600">
                  {isPreview ? 'produtos com informações pendentes (não serão adicionadas ao catalogo)' : 'produtos com informações pendentes'}
                </p>
                {importResult.errorsList && importResult.errorsList.length > 0 && (
                  <p className="text-xs text-red-500 mt-1">Clique para ver detalhes</p>
                )}
              </div>

              {/* Card 4: Botões de Ação (apenas no preview) */}
              {isPreview && (
                <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col gap-2">
                  <button
                    onClick={handleConfirmImport}
                    disabled={confirming || ((importResult.preview?.length || 0) === 0 && (importResult.skipped || 0) === 0)}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-colors text-sm ${
                      confirming || ((importResult.preview?.length || 0) === 0 && (importResult.skipped || 0) === 0)
                        ? 'bg-gray-400 text-white cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {confirming ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span className="text-xs">Adicionando...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle size={16} />
                        <span className="text-xs">Confirmar e Adicionar</span>
                      </>
                    )}
                  </button>
                  {importResult.errorProducts && importResult.errorProducts.length > 0 && (
                    <button
                      onClick={() => setCorrectingErrors(!correctingErrors)}
                      className="flex-1 px-4 py-3 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      <Edit2 size={16} />
                      <span className="text-xs">{correctingErrors ? 'Ocultar Correções' : 'Corrigir Erros'}</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Barra de Progresso (apenas no preview) */}
            {isPreview && (
              <>
                {/* Barra de Progresso */}
                {confirming && importProgress.total > 0 && (
                  <div className="mt-4 bg-gray-100 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        Processando importação...
                      </span>
                      <span className="text-sm font-bold text-primary-600">
                        {importProgress.current} / {importProgress.total} ({importProgress.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-primary-600 h-full rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${importProgress.percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {importProgress.percentage < 10 && 'Enviando arquivo...'}
                      {importProgress.percentage >= 10 && importProgress.percentage < 50 && 'Processando produtos...'}
                      {importProgress.percentage >= 50 && importProgress.percentage < 90 && 'Criando produtos e preços...'}
                      {importProgress.percentage >= 90 && importProgress.percentage < 100 && 'Finalizando...'}
                      {importProgress.percentage >= 100 && 'Concluído!'}
                    </p>
                    <button
                      onClick={() => {
                        setConfirming(false)
                        setImportProgress({ current: 0, total: 0, percentage: 0 })
                        toast('Importação cancelada', { icon: 'ℹ️' })
                      }}
                      className="mt-3 text-sm text-red-600 hover:text-red-800 font-medium"
                    >
                      Cancelar Importação
                    </button>
                  </div>
                )}
              </>
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

            {/* Produtos Criados */}
            {!isPreview && importResult.createdList && importResult.createdList.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <p className="text-sm font-bold text-green-900 mb-2">
                  ✅ Produtos criados com sucesso:
                </p>
                <ul className="text-xs text-green-800 space-y-1 max-h-40 overflow-y-auto">
                  {importResult.createdList.slice(0, 20).map((item: string, idx: number) => (
                    <li key={idx} className="list-disc list-inside">{item}</li>
                  ))}
                  {importResult.createdList.length > 20 && (
                    <li className="text-green-600 font-medium">
                      ... e mais {importResult.createdList.length - 20} produtos criados
                    </li>
                  )}
                </ul>
              </div>
            )}

            {importResult.skippedList && importResult.skippedList.length > 0 && showSkippedList && (
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

            {importResult.errorsList && importResult.errorsList.length > 0 && !correctingErrors && showErrorsList && (
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
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={(e) => {
              // Fechar modal ao clicar fora dele
              if (e.target === e.currentTarget) {
                setEditingErrorProduct(null)
              }
            }}
          >
            <div 
              className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
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
