'use client'

import { useState } from 'react'
import { Copy, QrCode, X } from 'lucide-react'
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

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const storeLink = storeSlug ? catalogStoreUrl(origin, storeSlug) : ''

  const copy = async (url: string, label: string) => {
    try {
      await navigator.clipboard.writeText(url)
      toast.success(`${label} copiado!`)
    } catch {
      toast.error('Não foi possível copiar')
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full py-2.5 px-3 rounded-xl text-sm font-bold border-2 border-violet-200 text-violet-900 bg-violet-50/90 hover:bg-violet-100 transition-colors flex items-center justify-center gap-2"
      >
        <QrCode size={18} />
        Acessar links para QR Code
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="qr-links-title"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-3 p-6 border-b border-gray-100 shrink-0">
              <div>
                <h3 id="qr-links-title" className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <QrCode className="text-primary-600" size={22} />
                  Links para QR Code
                </h3>
                <p className="text-sm text-gray-500 mt-1">{storeName}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                aria-label="Fechar"
              >
                <X size={22} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {!storeSlug ? (
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl p-4">
                  Este local ainda não tem link. Salve o cadastro (ou edite e salve) para gerar o slug
                  automaticamente.
                </p>
              ) : (
                <>
                  <section className="space-y-2">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Porta da loja (catálogo geral)
                    </h4>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Cole os links em qualquer gerador de QR (
                      <a
                        href="https://www.qrcode-monkey.com/pt/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 font-semibold hover:underline"
                      >
                        https://www.qrcode-monkey.com/pt/
                      </a>{' '}
                      é o melhor). O cliente abre direto no catálogo desta unidade.
                    </p>
                    <div className="flex gap-2">
                      <code className="flex-1 text-xs bg-gray-50 border rounded-lg px-3 py-2 break-all text-gray-800">
                        {storeLink}
                      </code>
                      <button
                        type="button"
                        onClick={() => void copy(storeLink, 'Link da loja')}
                        className="shrink-0 px-3 py-2 rounded-lg bg-primary-600 text-white text-sm font-bold hover:bg-primary-700 flex items-center gap-1"
                      >
                        <Copy size={16} />
                        Copiar
                      </button>
                    </div>
                  </section>

                  {categories.length > 0 && (
                    <section className="space-y-3">
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Prateleiras / setores (por categoria)
                      </h4>
                      <p className="text-sm text-gray-600">
                        Um QR por categoria — geladeira, frios, bebidas, etc. O catálogo abre já
                        filtrado na seção.
                      </p>
                      <ul className="space-y-2 max-h-52 overflow-y-auto pr-1">
                        {categories.map((cat) => {
                          const url = catalogCategoryUrl(origin, storeSlug, cat.slug)
                          return (
                            <li
                              key={cat.id}
                              className="flex flex-col sm:flex-row sm:items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl p-3"
                            >
                              <span className="text-sm font-bold text-gray-800 shrink-0 sm:w-36 truncate">
                                {cat.name}
                              </span>
                              <code className="flex-1 text-[11px] text-gray-600 break-all">
                                /loja/{storeSlug}/{cat.slug}
                              </code>
                              <button
                                type="button"
                                onClick={() => void copy(url, cat.name)}
                                className="shrink-0 px-2.5 py-1.5 rounded-lg border bg-white text-sm font-semibold text-primary-700 hover:bg-primary-50 flex items-center gap-1 self-start sm:self-center"
                              >
                                <Copy size={14} />
                                Copiar
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    </section>
                  )}
                </>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 shrink-0">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-full py-3 rounded-xl text-sm font-bold bg-gray-100 text-gray-800 hover:bg-gray-200"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
