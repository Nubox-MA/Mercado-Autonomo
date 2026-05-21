'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { useCondominium } from '@/contexts/CondominiumContext'

const PENDING_CATEGORY_KEY = 'catalog-pending-category-id'

type Props = {
  storeSlug: string
  categorySlug?: string
}

export default function CatalogDeepLinkLoader({ storeSlug, categorySlug }: Props) {
  const router = useRouter()
  const { setSelectedCondominium, isLoading: condominiumLoading } = useCondominium()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (condominiumLoading) return

    let cancelled = false

    async function resolveAndGo() {
      try {
        const params = new URLSearchParams({ loja: storeSlug })
        if (categorySlug) params.set('categoria', categorySlug)

        const { data } = await axios.get(`/api/catalog/deeplink?${params.toString()}`)
        if (cancelled) return

        const n = data.neighborhood
        setSelectedCondominium({
          id: n.id,
          name: n.name,
          photoUrl: n.photoUrl ?? undefined,
        })

        if (data.category?.id) {
          sessionStorage.setItem(PENDING_CATEGORY_KEY, data.category.id)
        } else {
          sessionStorage.removeItem(PENDING_CATEGORY_KEY)
        }

        router.replace('/')
      } catch (e: unknown) {
        if (cancelled) return
        const msg =
          axios.isAxiosError(e) && e.response?.data?.error
            ? String(e.response.data.error)
            : 'Não foi possível abrir o catálogo desta loja.'
        setError(msg)
      }
    }

    void resolveAndGo()
    return () => {
      cancelled = true
    }
  }, [storeSlug, categorySlug, condominiumLoading, setSelectedCondominium, router])

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <p className="text-red-600 font-bold mb-4">{error}</p>
          <button
            type="button"
            onClick={() => router.push('/select-condominium')}
            className="btn-primary w-full"
          >
            Escolher loja manualmente
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent" />
        <p className="mt-4 text-gray-600 font-medium">Abrindo catálogo…</p>
      </div>
    </div>
  )
}

export { PENDING_CATEGORY_KEY }
