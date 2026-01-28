import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware'
import { z } from 'zod'

const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(), // Aceita null
  price: z.number().positive().optional(),
  promoPrice: z.number().nullable().optional(), // Aceita null
  isPromotion: z.boolean().optional(),
  isNew: z.boolean().optional(),
  stock: z.number().int().min(0).optional(),
  imageUrl: z.string().nullable().optional(), // Aceita null
  categoryId: z.string().nullable().optional(), // Aceita null
  active: z.boolean().optional(),
})

interface RouteParams {
  params: {
    id: string
  }
}

// GET - Obter produto por ID (público)
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        category: true,
        productPrices: {
          include: {
            neighborhood: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      )
    }

    // Incrementar visualizações e registrar o evento com data/hora
    await prisma.$transaction([
      prisma.product.update({
        where: { id: params.id },
        data: { views: { increment: 1 } },
      }),
      prisma.productView.create({
        data: { productId: params.id }
      })
    ])

    return NextResponse.json({ product })
  } catch (error) {
    console.error('Get product error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar produto' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar produto (admin)
export async function PUT(req: NextRequest, { params }: RouteParams) {
  const auth = await authMiddleware(req, true)

  if (!auth.authorized) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const body = await req.json()
    console.log('Update product request body:', JSON.stringify(body, null, 2))
    
    const { condominiumPrices, ...productData } = body
    
    // Limpar campos vazios e converter valores
    const cleanedData: any = {}
    if (productData.name !== undefined && productData.name !== null) {
      cleanedData.name = String(productData.name).trim()
      if (cleanedData.name.length === 0) {
        return NextResponse.json(
          { error: 'Nome do produto não pode ser vazio' },
          { status: 400 }
        )
      }
    }
    if (productData.description !== undefined) {
      cleanedData.description = productData.description ? String(productData.description).trim() : null
    }
    if (productData.price !== undefined && productData.price !== null) {
      cleanedData.price = parseFloat(productData.price)
      if (isNaN(cleanedData.price) || cleanedData.price <= 0) {
        return NextResponse.json(
          { error: 'Preço deve ser um número positivo' },
          { status: 400 }
        )
      }
    }
    if (productData.promoPrice !== undefined) {
      cleanedData.promoPrice = productData.promoPrice ? parseFloat(productData.promoPrice) : null
    }
    if (productData.isPromotion !== undefined) {
      cleanedData.isPromotion = Boolean(productData.isPromotion)
    }
    if (productData.isNew !== undefined) {
      cleanedData.isNew = Boolean(productData.isNew)
    }
    if (productData.stock !== undefined && productData.stock !== null) {
      cleanedData.stock = parseInt(productData.stock)
      if (isNaN(cleanedData.stock) || cleanedData.stock < 0) {
        return NextResponse.json(
          { error: 'Estoque deve ser um número inteiro não negativo' },
          { status: 400 }
        )
      }
    }
    if (productData.imageUrl !== undefined) {
      cleanedData.imageUrl = productData.imageUrl ? String(productData.imageUrl).trim() : null
    }
    if (productData.categoryId !== undefined) {
      cleanedData.categoryId = productData.categoryId || null
    }
    if (productData.active !== undefined) {
      cleanedData.active = Boolean(productData.active)
    }

    console.log('Cleaned data:', JSON.stringify(cleanedData, null, 2))
    
    const data = updateProductSchema.parse(cleanedData)

    // Buscar produto atual para pegar o estoque padrão
    const currentProduct = await prisma.product.findUnique({
      where: { id: params.id },
    })

    if (!currentProduct) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      )
    }

    // Atualizar produto
    const product = await prisma.product.update({
      where: { id: params.id },
      data,
      include: {
        category: true,
      },
    })

    // Atualizar preços por condomínio (apenas se fornecidos)
    if (condominiumPrices !== undefined) {
      if (Array.isArray(condominiumPrices) && condominiumPrices.length > 0) {
        // Validar preços antes de atualizar
        const validPrices = condominiumPrices.filter((cp: any) => {
          if (!cp.neighborhoodId) {
            console.warn('Preço sem neighborhoodId ignorado:', cp)
            return false
          }
          const price = parseFloat(cp.price)
          if (isNaN(price) || price <= 0) {
            console.warn('Preço inválido ignorado:', cp)
            return false
          }
          return true
        })

        if (validPrices.length === 0) {
          return NextResponse.json(
            { error: 'Nenhum preço válido fornecido' },
            { status: 400 }
          )
        }

        // Deletar preços existentes para este produto
        await prisma.productPrice.deleteMany({
          where: { productId: params.id },
        })

        // Criar novos preços
        try {
          await prisma.productPrice.createMany({
            data: validPrices.map((cp: any) => ({
              productId: params.id,
              neighborhoodId: cp.neighborhoodId,
              price: parseFloat(cp.price),
              promoPrice: cp.promoPrice && cp.promoPrice !== '' ? parseFloat(cp.promoPrice) : null,
              isPromotion: cp.isPromotion || false,
              stock: cp.stock || currentProduct?.stock || 0,
            })),
          })
          console.log(`Preços atualizados: ${validPrices.length} preços criados`)
        } catch (priceError: any) {
          console.error('Error creating product prices:', priceError)
          return NextResponse.json(
            { error: `Erro ao criar preços: ${priceError.message}` },
            { status: 400 }
          )
        }
      } else if (Array.isArray(condominiumPrices) && condominiumPrices.length === 0) {
        // Se array vazio foi enviado explicitamente, deletar todos os preços
        await prisma.productPrice.deleteMany({
          where: { productId: params.id },
        })
        console.log('Todos os preços foram removidos (array vazio enviado)')
      }
      // Se condominiumPrices for null/undefined, não fazer nada (preservar preços existentes)
    }

    return NextResponse.json({ product })
  } catch (error) {
    console.error('Update product error:', error)
    if (error instanceof z.ZodError) {
      console.error('Validation errors:', error.errors)
      return NextResponse.json(
        { 
          error: error.errors[0].message,
          details: error.errors,
        },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { 
        error: 'Erro ao atualizar produto',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    )
  }
}

// DELETE - Deletar produto (admin)
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const auth = await authMiddleware(req, true)

  if (!auth.authorized) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    await prisma.product.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Produto deletado com sucesso' })
  } catch (error) {
    console.error('Delete product error:', error)
    return NextResponse.json(
      { error: 'Erro ao deletar produto' },
      { status: 500 }
    )
  }
}

