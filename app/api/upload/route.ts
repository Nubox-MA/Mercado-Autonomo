import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

// Função para configurar Cloudinary
async function getCloudinary() {
  try {
    const uploadMode = process.env.UPLOAD_MODE
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET

    console.log('Verificando configuração Cloudinary:', {
      uploadMode,
      hasCloudName: !!cloudName,
      hasApiKey: !!apiKey,
      hasApiSecret: !!apiSecret
    })

    if (!cloudName || !apiKey || !apiSecret || uploadMode !== 'cloudinary') {
      console.warn('Cloudinary não configurado corretamente')
      return null
    }

    // Import dinâmico do Cloudinary
    const cloudinaryModule = await import('cloudinary')
    const cloudinary = cloudinaryModule.v2

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    })

    console.log('Cloudinary configurado com sucesso:', cloudName)
    return cloudinary
  } catch (error: any) {
    console.error('Erro ao configurar Cloudinary:', {
      message: error?.message,
      stack: error?.stack
    })
    return null
  }
}

export async function POST(req: NextRequest) {
  const auth = await authMiddleware(req)

  if (!auth.authorized) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado' },
        { status: 400 }
      )
    }

    // Validar tipo de arquivo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo inválido. Use JPG, PNG ou WEBP' },
        { status: 400 }
      )
    }

    // Validar tamanho (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. Máximo 5MB' },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Verificar se deve usar Cloudinary
    const cloudinary = await getCloudinary()
    if (cloudinary && process.env.UPLOAD_MODE === 'cloudinary') {
      try {
        console.log('Iniciando upload para Cloudinary...')
        console.log('File info:', { name: file.name, type: file.type, size: file.size })
        
        // Converter para base64
        const base64 = buffer.toString('base64')
        const dataURI = `data:${file.type};base64,${base64}`

        // Upload para Cloudinary usando Promise
        const result = await new Promise<any>((resolve, reject) => {
          cloudinary.uploader.upload(
            dataURI,
            {
              folder: 'mercado-autonomo',
              resource_type: 'auto',
            },
            (error: any, result: any) => {
              if (error) {
                console.error('Cloudinary upload callback error:', {
                  message: error.message,
                  http_code: error.http_code,
                  name: error.name,
                  error: JSON.stringify(error, Object.getOwnPropertyNames(error))
                })
                reject(error)
              } else {
                console.log('Cloudinary upload success:', result?.secure_url)
                resolve(result)
              }
            }
          )
        })

        if (!result || !result.secure_url) {
          console.error('Cloudinary retornou resultado inválido:', result)
          throw new Error('Cloudinary retornou resultado inválido')
        }

        console.log('Upload concluído com sucesso:', result.secure_url)
        return NextResponse.json({ imageUrl: result.secure_url })
      } catch (cloudinaryError: any) {
        const errorDetails = {
          message: cloudinaryError?.message,
          http_code: cloudinaryError?.http_code,
          name: cloudinaryError?.name,
          stack: cloudinaryError?.stack,
          error: JSON.stringify(cloudinaryError, Object.getOwnPropertyNames(cloudinaryError))
        }
        
        console.error('Erro no upload Cloudinary (catch):', errorDetails)
        
        // Retornar detalhes completos do erro para o frontend
        return NextResponse.json(
          { 
            error: 'Erro ao fazer upload no Cloudinary',
            details: cloudinaryError?.message || cloudinaryError?.http_code || 'Erro desconhecido',
            httpCode: cloudinaryError?.http_code,
            errorName: cloudinaryError?.name,
            // Em desenvolvimento, incluir stack trace
            ...(process.env.NODE_ENV === 'development' ? { stack: cloudinaryError?.stack } : {})
          },
          { status: 500 }
        )
      }
    }

    // Caso contrário, usar upload local (desenvolvimento)
    // Criar pasta uploads se não existir
    const uploadsDir = join(process.cwd(), 'public', 'uploads')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Gerar nome único
    const timestamp = Date.now()
    const originalName = file.name.replace(/\s/g, '-')
    const filename = `${timestamp}-${originalName}`
    const filepath = join(uploadsDir, filename)

    await writeFile(filepath, buffer)

    const imageUrl = `/uploads/${filename}`

    return NextResponse.json({ imageUrl })
  } catch (error: any) {
    const errorDetails = {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      error: JSON.stringify(error, Object.getOwnPropertyNames(error))
    }
    
    console.error('Upload error (catch geral):', errorDetails)
    
    const cloudinaryInstance = await getCloudinary()
    const errorContext = {
      cloudinary: !!cloudinaryInstance,
      uploadMode: process.env.UPLOAD_MODE,
      hasCloudName: !!process.env.CLOUDINARY_CLOUD_NAME,
      hasApiKey: !!process.env.CLOUDINARY_API_KEY,
      hasApiSecret: !!process.env.CLOUDINARY_API_SECRET
    }
    
    console.error('Error context:', errorContext)
    
    return NextResponse.json(
      { 
        error: 'Erro ao fazer upload da imagem',
        details: error?.message || 'Erro desconhecido',
        context: errorContext,
        // Em desenvolvimento, incluir mais detalhes
        ...(process.env.NODE_ENV === 'development' ? { 
          stack: error?.stack,
          fullError: errorDetails
        } : {})
      },
      { status: 500 }
    )
  }
}
