import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { User } from '@prisma/client'

const JWT_SECRET = process.env.JWT_SECRET || 'mercado-autonomo-secret-key-2024-dev-only'

export interface JWTPayload {
  userId: string
  role: string
}

export function generateToken(user: User): string {
  try {
    const payload: JWTPayload = {
      userId: user.id,
      role: user.role,
    }
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
  } catch (error) {
    console.error('Erro ao gerar token:', error)
    throw new Error('Falha ao gerar token de autenticação')
  }
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  } catch (error) {
    return null
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

