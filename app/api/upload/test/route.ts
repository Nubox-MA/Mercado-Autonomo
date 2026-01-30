import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware'

export async function GET(req: NextRequest) {
  const auth = await authMiddleware(req)

  if (!auth.authorized) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const uploadMode = process.env.UPLOAD_MODE
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET

    const config = {
      uploadMode,
      hasCloudName: !!cloudName,
      hasApiKey: !!apiKey,
      hasApiSecret: !!apiSecret,
      cloudNameLength: cloudName?.length || 0,
      apiKeyLength: apiKey?.length || 0,
      apiSecretLength: apiSecret?.length || 0,
    }

    // Tentar importar Cloudinary
    let cloudinaryStatus = 'not_configured'
    if (cloudName && apiKey && apiSecret && uploadMode === 'cloudinary') {
      try {
        const cloudinaryModule = await import('cloudinary')
        const cloudinary = cloudinaryModule.v2
        
        cloudinary.config({
          cloud_name: cloudName,
          api_key: apiKey,
          api_secret: apiSecret,
        })
        
        cloudinaryStatus = 'configured'
      } catch (error: any) {
        cloudinaryStatus = `error: ${error?.message}`
      }
    }

    return NextResponse.json({
      config,
      cloudinaryStatus,
      message: cloudinaryStatus === 'configured' 
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
