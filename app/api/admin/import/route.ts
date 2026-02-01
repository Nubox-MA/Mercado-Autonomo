import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
// @ts-ignore - xlsx não tem tipos perfeitos
import * as XLSX from 'xlsx'

// Helper para buscar ou criar categoria "Sem Categoria"
async function getOrCreateUncategorizedCategory() {
  let uncategorizedCategory = await prisma.category.findUnique({
    where: { name: 'Sem Categoria' },
  })

  if (!uncategorizedCategory) {
    uncategorizedCategory = await prisma.category.create({
      data: { name: 'Sem Categoria' },
    })
  }

  return uncategorizedCategory
}

// POST - Preview da importação (não cria produtos ainda)
export async function POST(req: NextRequest) {
  const auth = await authMiddleware(req, true)

  if (!auth.authorized) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const selectedCondominiums = formData.get('condominiums') as string // JSON array de IDs
    const columnMapping = formData.get('columnMapping') as string // JSON com mapeamento
    const confirm = formData.get('confirm') === 'true' // Se true, realmente cria os produtos

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
    }

    // Parse dos parâmetros
    const condominiumIds = JSON.parse(selectedCondominiums || '[]')
    const mapping = JSON.parse(columnMapping || '{}')

    if (condominiumIds.length === 0) {
      return NextResponse.json({ error: 'Selecione pelo menos um condomínio' }, { status: 400 })
    }

    // Ler arquivo Excel
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

    if (data.length < 2) {
      return NextResponse.json({ error: 'Arquivo Excel vazio ou inválido' }, { status: 400 })
    }

    // Primeira linha são os cabeçalhos
    const headers = data[0].map((h: any) => String(h).trim().toLowerCase())
    const rows = data.slice(1)

    // Função para encontrar índice da coluna
    const getColumnIndex = (columnName: string): number => {
      const normalized = columnName.toLowerCase().trim()
      return headers.findIndex((h: string) => h.includes(normalized) || normalized.includes(h))
    }

    // Mapear colunas (com fallback para nomes comuns)
    const categoryCol = getColumnIndex(mapping.categoria || 'categoria')
    const marcaCol = getColumnIndex(mapping.marca || 'marca')
    const subcategoriaCol = getColumnIndex(mapping.subcategoria || 'subcategoria')
    const descricaoCol = getColumnIndex(mapping.descricao || 'descrição')
    const valorCol = getColumnIndex(mapping.valor || 'valor final')
    const situacaoCol = getColumnIndex(mapping.situacao || 'situação')

    if (categoryCol === -1 || valorCol === -1 || descricaoCol === -1) {
      return NextResponse.json(
        { error: 'Colunas obrigatórias não encontradas: Descrição, Categoria e Valor Final' },
        { status: 400 }
      )
    }

    // Buscar condomínios
    const condominiums = await prisma.neighborhood.findMany({
      where: { id: { in: condominiumIds } },
    })

    if (condominiums.length === 0) {
      return NextResponse.json({ error: 'Condomínios não encontrados' }, { status: 400 })
    }

    // Buscar produtos existentes para verificar duplicatas (usado apenas para evitar duplicatas na mesma importação)
    // Criar um mapa de nomes normalizados para IDs para busca rápida
    const existingProducts = await prisma.product.findMany({
      select: { id: true, name: true },
    })
    const existingProductNames = new Set(
      existingProducts.map((p) => p.name.toLowerCase().trim())
    )
    // Mapa de nome normalizado para produto (para busca rápida)
    const productNameMap = new Map<string, any>()
    existingProducts.forEach((p) => {
      productNameMap.set(p.name.toLowerCase().trim(), p)
    })

    // Sets para rastrear produtos únicos (evitar contar duplicatas)
    const uniqueSkippedProducts = new Set<string>() // Produtos únicos que já existem
    const uniqueNewProducts = new Set<string>() // Produtos únicos novos
    
    const results = {
      success: 0,
      skipped: 0, // Produtos únicos que já existem (preços serão adicionados)
      errors: 0,
      errorsList: [] as string[],
      skippedList: [] as string[], // Lista de produtos que já existem
      createdList: [] as string[], // Lista de produtos criados
      createdCategories: [] as string[],
      preview: [] as any[], // Lista de produtos que serão criados (para preview)
      errorProducts: [] as any[], // Produtos com erro que podem ser corrigidos
    }

    // Processar cada linha
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      
      // Pular linhas vazias
      if (!row || row.length === 0) continue

      try {
        // Extrair dados da linha
        const categoria = row[categoryCol] ? String(row[categoryCol]).trim() : ''
        const marca = marcaCol >= 0 && row[marcaCol] ? String(row[marcaCol]).trim() : ''
        const subcategoria = subcategoriaCol >= 0 && row[subcategoriaCol] ? String(row[subcategoriaCol]).trim() : ''
        const descricao = descricaoCol >= 0 && row[descricaoCol] ? String(row[descricaoCol]).trim() : ''
        const valorStr = row[valorCol] ? String(row[valorCol]).replace(',', '.').trim() : ''
        const situacao = situacaoCol >= 0 && row[situacaoCol] ? String(row[situacaoCol]).trim().toLowerCase() : 'ativo'

        // Validar campos obrigatórios: Descrição (nome do produto), Categoria e Valor Final
        if (!descricao || !descricao.trim()) {
          results.errors++
          results.errorsList.push(`Linha ${i + 2}: Descrição vazia (obrigatória para nome do produto)`)
          results.errorProducts.push({
            line: i + 2,
            error: 'Descrição vazia (obrigatória)',
            data: {
              categoria: categoria || '',
              marca: marca || '',
              subcategoria: subcategoria || '',
              descricao: descricao || '',
              valorStr: valorStr || '',
              situacao: situacao || 'ativo',
            },
          })
          continue
        }

        if (!categoria || !valorStr) {
          results.errors++
          results.errorsList.push(`Linha ${i + 2}: Categoria ou Valor Final vazio`)
          // Adicionar produto com erro para correção
          results.errorProducts.push({
            line: i + 2,
            error: 'Categoria ou Valor Final vazio',
            data: {
              categoria: categoria || '',
              marca: marca || '',
              subcategoria: subcategoria || '',
              descricao: descricao || '',
              valorStr: valorStr || '',
              situacao: situacao || 'ativo',
            },
          })
          continue
        }

        // Converter valor
        const valor = parseFloat(valorStr)
        if (isNaN(valor) || valor <= 0) {
          results.errors++
          results.errorsList.push(`Linha ${i + 2}: Valor Final inválido (${valorStr})`)
          // Adicionar produto com erro para correção
          results.errorProducts.push({
            line: i + 2,
            error: `Valor Final inválido (${valorStr})`,
            data: {
              categoria: categoria || '',
              marca: marca || '',
              subcategoria: subcategoria || '',
              descricao: descricao || '',
              valorStr: valorStr || '',
              situacao: situacao || 'ativo',
            },
          })
          continue
        }

        // Nome do produto = Descrição (do Excel)
        const productName = descricao || categoria // Se não tiver descrição, usar categoria como fallback
        
        if (!productName || !productName.trim()) {
          results.errors++
          results.errorsList.push(`Linha ${i + 2}: Descrição vazia (obrigatória para nome do produto)`)
          results.errorProducts.push({
            line: i + 2,
            error: 'Descrição vazia',
            data: {
              categoria: categoria || '',
              marca: marca || '',
              subcategoria: subcategoria || '',
              descricao: descricao || '',
              valorStr: valorStr || '',
              situacao: situacao || 'ativo',
            },
          })
          continue
        }

        // Normalizar nome para comparação
        const normalizedName = productName.toLowerCase().trim()

        // Buscar categoria
        let category = await prisma.category.findUnique({
          where: { name: categoria },
        })

        if (!category) {
          // Se não tiver categoria definida, usar "Sem Categoria"
          if (!categoria || categoria.trim() === '') {
            if (confirm) {
              category = await getOrCreateUncategorizedCategory()
            } else {
              category = { id: 'temp', name: 'Sem Categoria' } as any
            }
          } else {
            // Marcar que categoria será criada
            if (!results.createdCategories.includes(categoria)) {
              results.createdCategories.push(categoria)
            }
            
            if (confirm) {
              // Criar categoria apenas na confirmação
              category = await prisma.category.create({
                data: { name: categoria },
              })
            } else {
              // Para preview, usar categoria temporária
              category = { id: 'temp', name: categoria } as any
            }
          }
        }

        // Determinar se produto está ativo
        const active = situacao === 'ativo' || situacao === 'disponível' || situacao === '' || !situacao

        // Verificar se produto já existe (também no preview para mostrar corretamente)
        const normalizedProductName = productName.toLowerCase().trim()
        const productExists = existingProductNames.has(normalizedProductName)
        
        if (productExists) {
          // Produto já existe - será adicionado à lista de "já existem"
          // Contar apenas produtos únicos (não contar duplicatas do Excel)
          if (!uniqueSkippedProducts.has(normalizedProductName)) {
            uniqueSkippedProducts.add(normalizedProductName)
            results.skipped++
            results.skippedList.push(`"${productName}" já existe - preços serão adicionados`)
          } else {
            // Produto já foi contado, apenas adicionar à lista de detalhes
            results.skippedList.push(`Linha ${i + 2}: "${productName}" (já contado anteriormente)`)
          }
        } else {
          // Produto novo - adicionar à lista de preview
          // Contar apenas produtos únicos (não contar duplicatas do Excel)
          if (!uniqueNewProducts.has(normalizedProductName)) {
            uniqueNewProducts.add(normalizedProductName)
            const previewItem = {
              name: productName,
              description: null, // Descrição sempre null na aplicação
              price: valor,
              category: categoria,
              active,
              condominiums: condominiums.map((c) => c.name),
            }
            results.preview.push(previewItem)
          }
        }

        // Se for confirmação, criar ou atualizar produto
        if (confirm) {
          try {
            // Garantir que categoria existe (criar se necessário)
            if (!category || category.id === 'temp') {
              if (!categoria || categoria.trim() === '') {
                // Se não tiver categoria, usar "Sem Categoria"
                category = await getOrCreateUncategorizedCategory()
              } else {
                category = await prisma.category.upsert({
                  where: { name: categoria },
                  update: {},
                  create: { name: categoria },
                })
              }
            }

            // Verificar se produto já existe (por nome) - usar mapa para busca rápida
            const normalizedProductName = productName.toLowerCase().trim()
            let product = productNameMap.get(normalizedProductName)
            
            // Se não encontrou no mapa, buscar no banco (pode ser produto novo ou nome com diferença de case)
            if (!product) {
              // Buscar por nome exato (case-sensitive primeiro)
              product = await prisma.product.findFirst({
                where: {
                  name: productName,
                },
              })
              
              // Se não encontrou, buscar todos os produtos e comparar case-insensitive
              // (mais eficiente que buscar por categoria, pois pode haver produtos com mesmo nome em categorias diferentes)
              if (!product) {
                const allProducts = await prisma.product.findMany({
                  select: {
                    id: true,
                    name: true,
                  },
                })
                const found = allProducts.find(
                  (p) => p.name.toLowerCase().trim() === normalizedProductName
                )
                if (found) {
                  product = found
                  // Adicionar ao mapa para próximas buscas
                  productNameMap.set(normalizedProductName, product)
                }
              } else {
                // Adicionar ao mapa se encontrou por busca exata
                productNameMap.set(normalizedProductName, product)
              }
            }

            if (!product) {
              // Criar novo produto
              try {
                product = await prisma.product.create({
                  data: {
                    name: productName,
                    description: null, // Descrição sempre null
                    price: valor,
                    promoPrice: null,
                    isPromotion: false,
                    isNew: false,
                    stock: 0,
                    imageUrl: null,
                    categoryId: category.id,
                    active,
                  },
                })
                results.success++
                results.createdList.push(productName) // Adicionar à lista de produtos criados
                
                // Adicionar ao mapa e set para evitar duplicatas na mesma importação
                productNameMap.set(normalizedProductName, product)
                existingProductNames.add(normalizedProductName)
                
              } catch (createError: any) {
                console.error(`Erro ao criar produto na linha ${i + 2}:`, createError)
                // Se o erro for de duplicata (unique constraint), tentar buscar o produto existente
                if (createError.code === 'P2002' || createError.message?.includes('Unique constraint')) {
                  const existingProduct = await prisma.product.findFirst({
                    where: {
                      name: productName,
                    },
                  })
                  if (existingProduct) {
                    product = existingProduct
                    productNameMap.set(normalizedProductName, product)
                    existingProductNames.add(normalizedProductName)
                    results.skipped++
                    results.skippedList.push(`Linha ${i + 2}: "${productName}" já existe (detectado por constraint) - adicionando preços`)
                  } else {
                    throw new Error(`Erro ao criar produto: ${createError.message}`)
                  }
                } else {
                  throw new Error(`Erro ao criar produto: ${createError.message}`)
                }
              }
            } else {
              // Produto já existe - apenas adicionar preços para condomínios selecionados
              // (não incrementar skipped aqui, pois já foi incrementado no preview)
              if (!results.skippedList.some(msg => msg.includes(`"${productName}"`))) {
                results.skipped++
                results.skippedList.push(`Linha ${i + 2}: "${productName}" já existe - adicionando preços para condomínios selecionados`)
              }
            }

            // Verificar quais condomínios já têm preço para este produto
            const existingPrices = await prisma.productPrice.findMany({
              where: {
                productId: product.id,
                neighborhoodId: { in: condominiums.map((c) => c.id) },
              },
              select: {
                neighborhoodId: true,
              },
            })

            const existingNeighborhoodIds = new Set(existingPrices.map((p) => p.neighborhoodId))

            // Criar preços apenas para condomínios selecionados que ainda não têm preço
            const newPrices = condominiums
              .filter((cond) => !existingNeighborhoodIds.has(cond.id))
              .map((cond) => ({
                productId: product.id,
                neighborhoodId: cond.id,
                price: valor,
                promoPrice: null,
                isPromotion: false,
                stock: 0,
              }))

            if (newPrices.length > 0) {
              try {
                await prisma.productPrice.createMany({
                  data: newPrices,
                })
              } catch (priceError: any) {
                console.error(`Erro ao criar preços na linha ${i + 2}:`, priceError)
                throw new Error(`Erro ao criar preços: ${priceError.message}`)
              }
            }

            // O set já foi atualizado acima quando o produto foi criado ou encontrado
          } catch (confirmError: any) {
            // Re-lançar erro para ser capturado pelo catch externo
            throw confirmError
          }
        }
      } catch (error: any) {
        results.errors++
        const errorMsg = `Linha ${i + 2}: ${error.message || 'Erro desconhecido'}`
        results.errorsList.push(errorMsg)
        // Adicionar produto com erro para correção
        try {
          const categoria = row[categoryCol] ? String(row[categoryCol]).trim() : ''
          const marca = marcaCol >= 0 && row[marcaCol] ? String(row[marcaCol]).trim() : ''
          const subcategoria = subcategoriaCol >= 0 && row[subcategoriaCol] ? String(row[subcategoriaCol]).trim() : ''
          const descricao = descricaoCol >= 0 && row[descricaoCol] ? String(row[descricaoCol]).trim() : ''
          const valorStr = row[valorCol] ? String(row[valorCol]).replace(',', '.').trim() : ''
          const situacao = situacaoCol >= 0 && row[situacaoCol] ? String(row[situacaoCol]).trim().toLowerCase() : 'ativo'
          
          results.errorProducts.push({
            line: i + 2,
            error: error.message || 'Erro desconhecido',
            data: {
              categoria: categoria || '',
              marca: marca || '',
              subcategoria: subcategoria || '',
              descricao: descricao || '',
              valorStr: valorStr || '',
              situacao: situacao || 'ativo',
            },
          })
        } catch {
          // Se não conseguir extrair dados, pular
        }
      }
    }

    if (confirm) {
      return NextResponse.json({
        message: `Importação concluída: ${results.success} produtos únicos criados, ${results.skipped} produtos únicos existentes tiveram preços adicionados, ${results.errors} erros`,
        results,
      })
    } else {
      return NextResponse.json({
        message: `Preview: ${results.preview.length} produtos únicos prontos para importar, ${results.skipped} produtos únicos existentes terão preços adicionados, ${results.errors} erros encontrados`,
        results,
        isPreview: true,
      })
    }
  } catch (error: any) {
    console.error('Import error:', error)
    console.error('Error stack:', error.stack)
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      code: error.code,
    })
    
    return NextResponse.json(
      { 
        error: 'Erro ao processar arquivo Excel', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
