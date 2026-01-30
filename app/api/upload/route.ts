import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

// Função para configurar Cloudinary
function getCloudinary() {
  try {
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.UPLOAD_MODE === 'cloudinary') {
      const cloudinary = require('cloudinary').v2
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      })
      console.log('Cloudinary configurado:', process.env.CLOUDINARY_CLOUD_NAME)
      return cloudinary
    } else {
      console.warn('Cloudinary não configurado - CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME, 'UPLOAD_MODE:', process.env.UPLOAD_MODE)
      return null
    }
  } catch (error) {
    console.error('Erro ao configurar Cloudinary:', error)
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
    const cloudinary = getCloudinary()
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
                console.error('Cloudinary upload error:', {
                  message: error.message,
                  http_code: error.http_code,
                  name: error.name
                })
                reject(error)
              } else {
                console.log('Cloudinary upload success:', result.secure_url)
                resolve(result)
              }
            }
          )
        })

        if (!result || !result.secure_url) {
          throw new Error('Cloudinary retornou resultado inválido')
        }

        return NextResponse.json({ imageUrl: result.secure_url })
      } catch (cloudinaryError: any) {
        console.error('Erro no upload Cloudinary:', {
          message: cloudinaryError?.message,
          http_code: cloudinaryError?.http_code,
          name: cloudinaryError?.name,
          stack: cloudinaryError?.stack
        })
        return NextResponse.json(
          { 
            error: 'Erro ao fazer upload no Cloudinary',
            details: cloudinaryError?.message || 'Erro desconhecido'
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
    console.error('Upload error:', error)
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      cloudinary: !!cloudinary,
      uploadMode: process.env.UPLOAD_MODE,
      hasCloudName: !!process.env.CLOUDINARY_CLOUD_NAME
    })
    return NextResponse.json(
      { 
        error: 'Erro ao fazer upload da imagem',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    )
  }
}
