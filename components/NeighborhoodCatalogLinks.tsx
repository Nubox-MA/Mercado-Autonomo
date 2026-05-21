'use client'

import { useState } from 'react'
import { Copy, ChevronDown, ChevronUp, QrCode } from 'lucide-react'
import toast from 'react-hot-toast'
import { catalogCategoryUrl, catalogStoreUrl } from '@/lib/slug'

type CategoryLink = {
  id: string
  name: string
  slug: string
}

type Props = {
  storeName: string
  storeSlug?: string | null
  categories: CategoryLink[]
}

export default function NeighborhoodCatalogLinks({
  storeName,
  storeSlug,
  categories,
}: Props) {
  const [open, setOpen] = useState(false)

  if (!storeSlug) {
    return (
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5 mt-2">
        Salve o local para gerar o link do catálogo (slug automático).
      </p>
    )
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const storeLink = catalogStoreUrl(origin, storeSlug)

  const copy = async (url: string, label: string) => {
    try {
      await navigator.clipboard.writeText(url)
      toast.success(`${label} copiado!`)
    } catch {
      toast.error('Não foi possível copiar')
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50/80 p-3 space-y-2">
      <div className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wide">
        <QrCode size={14} className="text-primary-600" />
        Links para QR Code
      </div>
      <p className="text-[11px] text-gray-500 leading-snug">
        Cole em qualquer gerador de QR (Canva, QR Code Monkey, etc.). O cliente abre direto no
        catálogo de <strong>{storeName}</strong>.
      </p>
      <div className="flex gap-1">
        <code className="flex-1 text-[10px] bg-white border rounded px-2 py-1 truncate text-gray-700">
          {storeLink}
        </code>
        <button
          type="button"
          onClick={() => void copy(storeLink, 'Link da loja')}
          className="shrink-0 p-1.5 rounded-lg bg-white border hover:bg-primary-50 text-primary-700"
          title="Copiar link da loja"
        >
          <Copy size={14} />
        </button>
      </div>
      {categories.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-xs font-bold text-primary-700 flex items-center gap-1"
          >
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            Links por categoria (prateleira / geladeira)
          </button>
          {open && (
            <ul className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
              {categories.map((cat) => {
                const url = catalogCategoryUrl(origin, storeSlug, cat.slug)
                return (
                  <li key={cat.id} className="flex gap-1 items-center">
                    <span className="text-[10px] font-semibold text-gray-600 w-24 shrink-0 truncate">
                      {cat.name}
                    </span>
                    <code className="flex-1 text-[10px] bg-white border rounded px-1.5 py-0.5 truncate">
                      /loja/{storeSlug}/{cat.slug}
                    </code>
                    <button
                      type="button"
                      onClick={() => void copy(url, cat.name)}
                      className="shrink-0 p-1 rounded bg-white border hover:bg-primary-50"
                      title="Copiar"
                    >
                      <Copy size={12} />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
