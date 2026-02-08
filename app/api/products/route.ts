import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware'
import { z } from 'zod'

const createProductSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().nullable().optional(), // Aceita null
  price: z.number().positive('Preço deve ser positivo'),
  promoPrice: z.number().nullable().optional(), // Aceita null
  isPromotion: z.boolean().optional().default(false),
  isNew: z.boolean().optional().default(false),
  stock: z.number().int().min(0, 'Estoque não pode ser negativo'),
  imageUrl: z.string().nullable().optional(), // Aceita null
  categoryId: z.string().nullable().optional(), // Aceita null
  active: z.boolean().optional().default(true),
})

// GET - Listar produtos (público)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const categoryId = searchParams.get('categoryId')
    const neighborhoodId = searchParams.get('neighborhoodId') // ID do condomínio
    const activeOnly = searchParams.get('activeOnly') === 'true'
    const minPrice = searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined
    const maxPrice = searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined
    const sortBy = searchParams.get('sortBy') || 'name' // name, price_asc, price_desc, views
    const isNew = searchParams.get('isNew') === 'true'
    const isPromotion = searchParams.get('isPromotion') === 'true'

    const where: any = {}
    
    // Se não tiver neighborhoodId, ainda assim buscar produtos (sem preços específicos)
    // Nota: A busca case-insensitive será feita após buscar do banco para garantir compatibilidade

    if (categoryId) {
      where.categoryId = categoryId
    }

    if (activeOnly) {
      where.active = true
    }

    if (isNew) {
      where.isNew = true
    }

    // NÃO filtrar isPromotion aqui se tiver neighborhoodId
    // porque o isPromotion real vem de ProductPrice quando há condomínio
    // Vamos filtrar depois de mapear os preços do condomínio
    if (isPromotion && !neighborhoodId) {
      where.isPromotion = true
    }

    let orderBy: any = { name: 'asc' }
    if (sortBy === 'price_asc') orderBy = { price: 'asc' }
    if (sortBy === 'price_desc') orderBy = { price: 'desc' }
    if (sortBy === 'views') orderBy = { views: 'desc' }
    if (sortBy === 'newest') orderBy = { createdAt: 'desc' }

    // Buscar produtos
    const includeOptions: any = {
      category: true,
    }
    
    // Tentar adicionar productPrices apenas se tiver neighborhoodId
    // Se a tabela não existir ainda, continuar sem ela
    if (neighborhoodId) {
      try {
        includeOptions.productPrices = {
          where: {
            neighborhoodId: neighborhoodId,
          },
          take: 1,
        }
      } catch (e) {
        // Se falhar, continuar sem productPrices
        console.warn('Não foi possível incluir productPrices:', e)
      }
    }

    let products
    try {
      products = await prisma.product.findMany({
        where,
        include: includeOptions,
        orderBy,
      })
    } catch (dbError: any) {
      // Se o erro for relacionado a productPrices, tentar sem ele
      if (dbError?.message?.includes('productPrices') || dbError?.message?.includes('product_prices')) {
        console.warn('Erro ao buscar productPrices, tentando sem eles:', dbError.message)
        delete includeOptions.productPrices
        products = await prisma.product.findMany({
          where,
          include: includeOptions,
          orderBy,
        })
      } else {
        throw dbError
      }
    }

    // Aplicar filtro case-insensitive de busca se necessário (após buscar do banco)
    let filteredProducts = products
    if (search) {
      const searchLower = search.toLowerCase()
      filteredProducts = products.filter((product) => {
        const nameMatch = product.name.toLowerCase().includes(searchLower)
        const descMatch = product.description?.toLowerCase().includes(searchLower) || false
        return nameMatch || descMatch
      })
    }

    // Mapear produtos para usar preços específicos do condomínio quando disponível
    // IMPORTANTE: Se neighborhoodId for fornecido, mostrar apenas produtos que têm preço para esse condomínio
    const productsWithPrices = filteredProducts
      .map((product) => {
        // Se tiver neighborhoodId, produto DEVE ter preço para esse condomínio
        if (neighborhoodId && 'productPrices' in product) {
          const prices = (product as any).productPrices
          if (!prices || !Array.isArray(prices) || prices.length === 0) {
            // Produto não tem preço para este condomínio - não mostrar
            return null
          }
        } else if (neighborhoodId) {
          // Se neighborhoodId foi fornecido mas não há productPrices, não mostrar
          return null
        }

        // ORIGEM DOS VALORES DO PRODUTO:
        // 
        // IMPORTANTE: O preço padrão (product.price) é APENAS um valor inicial/referência usado pelo admin
        // ao criar o produto. Ele NÃO é exibido para o cliente.
        //
        // REGRA: Quando um cliente seleciona um condomínio, ele SÓ vê produtos que têm preço cadastrado
        // na tabela ProductPrice para aquele condomínio específico. Cada condomínio pode ter preço diferente.
        //
        // Exemplo:
        // - Produto "Arroz 5kg" tem preço padrão R$ 20,00 (apenas referência)
        // - Morada do Verde: R$ 18,50 (na tabela ProductPrice)
        // - Jardim Primavera: R$ 19,00 (na tabela ProductPrice)
        // O cliente do "Morada do Verde" vê R$ 18,50, não R$ 20,00
        
        // Inicializar com valores padrão (só serão usados se NÃO houver condomínio selecionado)
        let finalPrice = product.price
        let finalPromoPrice = product.promoPrice
        let finalIsPromotion = product.isPromotion
        let finalStock = product.stock

        // Se houver condomínio selecionado, OBRIGATORIAMENTE usar preço da tabela ProductPrice
        // (o produto só aparece se tiver preço específico para aquele condomínio)
        if (neighborhoodId && 'productPrices' in product) {
          const prices = (product as any).productPrices
          if (prices && Array.isArray(prices) && prices.length > 0) {
            const condominiumPrice = prices[0]
            if (condominiumPrice) {
              finalPrice = condominiumPrice.price // Preço específico do condomínio (OBRIGATÓRIO)
              finalPromoPrice = condominiumPrice.promoPrice ?? null
              finalIsPromotion = condominiumPrice.isPromotion
              finalStock = condominiumPrice.stock
            }
          }
        }

        // Filtrar por preço se necessário
        if (minPrice !== undefined && finalPrice < minPrice) return null
        if (maxPrice !== undefined && finalPrice > maxPrice) return null

        // Filtrar por isPromotion DEPOIS de mapear os preços do condomínio
        if (isPromotion && !finalIsPromotion) return null

        // Criar objeto de retorno sem productPrices
        const productCopy: any = { ...product }
        delete productCopy.productPrices
        
        return {
          ...productCopy,
          price: finalPrice,
          promoPrice: finalPromoPrice,
          isPromotion: finalIsPromotion,
          stock: finalStock,
          active: product.active, // Garantir que active seja retornado
        }
      })
      .filter((p): p is NonNullable<typeof p> => p !== null)

    // Aplicar ordenação por preço se necessário (após mapear)
    if (sortBy === 'price_asc' || sortBy === 'price_desc') {
      productsWithPrices.sort((a, b) => {
        const priceA = a.isPromotion && a.promoPrice ? a.promoPrice : a.price
        const priceB = b.isPromotion && b.promoPrice ? b.promoPrice : b.price
        return sortBy === 'price_asc' ? priceA - priceB : priceB - priceA
      })
    }

    return NextResponse.json({ products: productsWithPrices })
  } catch (error: any) {
    console.error('Get products error:', error)
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    })
    return NextResponse.json(
      { 
        error: 'Erro ao buscar produtos',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    )
  }
}

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

// POST - Criar produto (admin)
export async function POST(req: NextRequest) {
  const auth = await authMiddleware(req, true)

  if (!auth.authorized) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { condominiumPrices, ...productData } = body
    const data = createProductSchema.parse(productData)

    // Se não tiver categoria, atribuir à "Sem Categoria"
    if (!data.categoryId) {
      const uncategorizedCategory = await getOrCreateUncategorizedCategory()
      data.categoryId = uncategorizedCategory.id
    }

    // Criar produto
    const product = await prisma.product.create({
      data,
      include: {
        category: true,
      },
    })

    // Criar preços por condomínio se fornecidos
    if (condominiumPrices && Array.isArray(condominiumPrices) && condominiumPrices.length > 0) {
      await prisma.productPrice.createMany({
        data: condominiumPrices.map((cp: any) => ({
          productId: product.id,
          neighborhoodId: cp.neighborhoodId,
          price: cp.price,
          promoPrice: cp.promoPrice || null,
          isPromotion: cp.isPromotion || false,
          stock: cp.stock || data.stock,
        })),
      })
    }

    return NextResponse.json({ product }, { status: 201 })
  } catch (error) {
    console.error('Create product error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Erro ao criar produto' },
      { status: 500 }
    )
  }
}

