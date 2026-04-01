import { prisma } from '@/lib/prisma'

export const DEFAULT_LOW_STOCK_THRESHOLD = 10

export async function getLowStockThreshold(): Promise<number> {
  const row = await prisma.setting.findUnique({ where: { key: 'lowStockThreshold' } })
  const n = parseInt(row?.value ?? '', 10)
  if (!Number.isFinite(n) || n < 0) return DEFAULT_LOW_STOCK_THRESHOLD
  return Math.min(99999, Math.max(0, n))
}
