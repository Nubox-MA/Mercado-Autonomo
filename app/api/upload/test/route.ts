import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware'

export async function GET(req: NextRequest) {
  const auth = await authMiddleware(req)

  if (!auth.authorized) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const uploadMode = process.env.UPLOAD_MODE
    const cloudinaryUrl = process.env.CLOUDINARY_URL
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET

    const config = {
      uploadMode,
      hasCloudinaryUrl: !!cloudinaryUrl,
      hasCloudName: !!cloudName,
      hasApiKey: !!apiKey,
      hasApiSecret: !!apiSecret,
      cloudinaryUrlLength: cloudinaryUrl?.length || 0,
      cloudNameLength: cloudName?.length || 0,
      apiKeyLength: apiKey?.length || 0,
      apiSecretLength: apiSecret?.length || 0,
    }

    // Tentar importar Cloudinary
    let cloudinaryStatus = 'not_configured'
    if (uploadMode === 'cloudinary') {
      try {
        const cloudinaryModule = await import('cloudinary')
        const cloudinary = cloudinaryModule.v2
        
        // Método 1: Usar CLOUDINARY_URL (recomendado)
        if (cloudinaryUrl) {
          cloudinary.config(cloudinaryUrl.trim())
          cloudinaryStatus = 'configured (via CLOUDINARY_URL)'
        }
        // Método 2: Usar variáveis separadas
        else if (cloudName && apiKey && apiSecret) {
          cloudinary.config({
            cloud_name: cloudName.trim(),
            api_key: apiKey.trim(),
            api_secret: apiSecret.trim(),
          })
          cloudinaryStatus = 'configured (via variáveis separadas)'
        } else {
          cloudinaryStatus = 'not_configured (faltam variáveis)'
        }
      } catch (error: any) {
        cloudinaryStatus = `error: ${error?.message}`
      }
    }

    return NextResponse.json({
      config,
      cloudinaryStatus,
      message: cloudinaryStatus.includes('configured')
        ? 'Cloudinary configurado corretamente' 
        : 'Cloudinary não configurado ou com erro'
    })
  } catch (error: any) {
    return NextResponse.json(
      { 
        error: 'Erro ao verificar configuração',
        details: error?.message 
      },
      { status: 500 }
    )
  }
}
