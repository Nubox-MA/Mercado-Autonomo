import { NextRequest, NextResponse } from 'next/server'
import { prisma } from './prisma'

export async function authMiddleware(
  req: NextRequest,
  requireAdmin = false
): Promise<{ authorized: boolean; userId?: string; role?: string }> {
  const authHeader = req.headers.get('authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authorized: false }
  }

  const token = authHeader.substring(7)
  
  // Verificar se é token de admin
  if (token.startsWith('admin-token-')) {
    // Extrair o ID corretamente (tudo entre admin-token- e o último hífen)
    const adminTokenPrefix = 'admin-token-'
    const withoutPrefix = token.substring(adminTokenPrefix.length)
    const lastDashIndex = withoutPrefix.lastIndexOf('-')
    const userId = withoutPrefix.substring(0, lastDashIndex)
    
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      })
      
      if (!user || user.role !== 'ADMIN') {
        return { authorized: false }
      }
      return {
        authorized: true,
        userId: user.id,
        role: user.role,
      }
    } catch (error) {
      return { authorized: false }
    }
  }
  
  // Verificar se é token de usuário
  if (token.startsWith('user-token-')) {
    // Extrair o ID corretamente (tudo entre user-token- e o último hífen)
    const userTokenPrefix = 'user-token-'
    const withoutPrefix = token.substring(userTokenPrefix.length)
    const lastDashIndex = withoutPrefix.lastIndexOf('-')
    const userId = withoutPrefix.substring(0, lastDashIndex)
    
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      })
      
      if (!user) {
        return { authorized: false }
      }
      
      if (requireAdmin && user.role !== 'ADMIN') {
        return { authorized: false }
      }
      
      return {
        authorized: true,
        userId: user.id,
        role: user.role,
      }
    } catch (error) {
      return { authorized: false }
    }
  }

  return { authorized: false }
}

