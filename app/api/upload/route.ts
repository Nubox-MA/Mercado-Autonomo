import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

// Cloudinary (opcional - só carrega se configurado)
let cloudinary: any = null
try {
  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.UPLOAD_MODE === 'cloudinary') {
    const cloudinaryModule = require('cloudinary')
    cloudinary = cloudinaryModule.v2
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    })
  }
} catch (error) {
  console.warn('Cloudinary não configurado, usando upload local')
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

    // Se Cloudinary estiver configurado e modo for cloudinary, usar Cloudinary
    if (cloudinary && process.env.UPLOAD_MODE === 'cloudinary') {
      // Converter para base64
      const base64 = buffer.toString('base64')
      const dataURI = `data:${file.type};base64,${base64}`

      // Upload para Cloudinary
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload(
          dataURI,
          {
            folder: 'mercado-autonomo',
            resource_type: 'auto',
          },
          (error: any, result: any) => {
            if (error) reject(error)
            else resolve(result)
          }
        )
      }) as any

      return NextResponse.json({ imageUrl: result.secure_url })
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
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Erro ao fazer upload da imagem' },
      { status: 500 }
    )
  }
}
