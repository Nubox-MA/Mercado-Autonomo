'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import axios from 'axios'
import { Plus, Edit, Trash2, MapPin, Upload, BarChart3, AlertTriangle, X } from 'lucide-react'
import toast from 'react-hot-toast'
import ConfirmModal from '@/components/ConfirmModal'
import Image from 'next/image'

interface Neighborhood {
  id: string
  name: string
  displayOrder?: number | null
  active: boolean
  photoUrl?: string | null
  deliveryFee?: number
  externalId?: string | null
  externalSystem?: string | null
  saurusDominio?: string | null
  saurusTabPrecoId?: string | null
  saurusSyncEnabled?: boolean
  saurusPdvKeyConfigured?: boolean
  saurusLastSyncAt?: string | null
  saurusLastSyncOk?: boolean | null
  saurusLastSyncMessage?: string | null
  saurusLastSyncSummary?: string | null
}

type SyncSummary = {
  neighborhood: { id: string; name: string }
  startedAt?: string
  finishedAt?: string
  durationMs?: number
  produtos: number
  precos: number
  estoques: number
  produtosGravados?: number
  produtosPulados?: number
  idLoja: string | null
  tabPrecoId: string | null
  dryRun: boolean
  upserts: {
    createdProducts: number
    updatedProducts: number
    upsertedProductPrices: number
    updatedStocks: number
  }
  warnings: string[]
}

type SyncHealthResponse = {
  range: '24h' | '7d'
  summary: {
    totalRuns: number
    successes: number
    failures: number
    successRate: number
  }
  neighborhoodStats: Array<{
    id: string
    name: string
    total: number
    successes: number
    failures: number
    avgDurationMs: number | null
    successRate: number | null
  }>
  recentErrors: Array<{
    id: string
    neighborhoodId: string
    neighborhoodName: string
    finishedAt: string
    message: string
    durationMs: number | null
  }>
}

const formatDuration = (ms?: number | null): string | null => {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms < 0) return null
  const totalSeconds = Math.round(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export default function NeighborhoodsPage() {
  const { token } = useAuth()
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([])
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState<{ id: string; name: string } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [dryRunId, setDryRunId] = useState<string | null>(null)

  const [syncConfirm, setSyncConfirm] = useState<{
    id: string
    name: string
    forceImageRefresh?: boolean
  } | null>(null)
  const [syncOverlay, setSyncOverlay] = useState<{
    open: boolean
    percent: number
    label: string
    current?: number
    total?: number
    error: string | null
    summary: SyncSummary | null
  }>({
    open: false,
    percent: 0,
    label: '',
    error: null,
    summary: null,
  })
  const [dryRunResult, setDryRunResult] = useState<{
    neighborhoodName: string
    summary: SyncSummary
  } | null>(null)
  const [syncHealthOpen, setSyncHealthOpen] = useState(false)
  const [syncHealthRange, setSyncHealthRange] = useState<'24h' | '7d'>('24h')
  const [syncHealthLoading, setSyncHealthLoading] = useState(false)
  const [syncHealthClearing, setSyncHealthClearing] = useState(false)
  const [syncHealthClearConfirmOpen, setSyncHealthClearConfirmOpen] = useState(false)
  const [syncHealth, setSyncHealth] = useState<SyncHealthResponse | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    displayOrder: '',
    active: true,
    photoUrl: '',
    externalId: '',
    saurusDominio: '',
    saurusPdvKey: '',
    saurusTabPrecoId: '',
    saurusSyncEnabled: false,
    clearSaurusPdvKey: false,
  })
  const [uploading, setUploading] = useState(false)

  const fetchNeighborhoods = useCallback(
    async (opts?: { silent?: boolean }) => {
      try {
        if (!opts?.silent) setLoading(true)
        const response = await axios.get('/api/admin/neighborhoods', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          params: { _t: Date.now() },
        })
        setNeighborhoods(response.data)
      } catch (error) {
        console.error('Error fetching neighborhoods:', error)
        toast.error('Erro ao buscar locais')
      } finally {
        if (!opts?.silent) setLoading(false)
      }
    },
    [token]
  )

  useEffect(() => {
    fetchNeighborhoods()
  }, [fetchNeighborhoods])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || formData.name.trim() === '') {
      toast.error('O nome do local é obrigatório')
      return
    }

    try {
      setIsSaving(true)

      const dataToSend: Record<string, unknown> = {
        name: formData.name.trim(),
        active: formData.active,
        externalSystem: 'SAURUS',
      }
      dataToSend.displayOrder = formData.displayOrder.trim() === '' ? null : formData.displayOrder.trim()

      if (formData.photoUrl) {
        dataToSend.photoUrl = formData.photoUrl.trim()
      }

      dataToSend.externalId = formData.externalId.trim() || null
      dataToSend.saurusDominio = formData.saurusDominio.trim() || null
      dataToSend.saurusTabPrecoId = formData.saurusTabPrecoId.trim() || null
      dataToSend.saurusSyncEnabled = formData.saurusSyncEnabled

      if (formData.clearSaurusPdvKey) {
        dataToSend.clearSaurusPdvKey = true
      } else if (formData.saurusPdvKey.trim()) {
        dataToSend.saurusPdvKey = formData.saurusPdvKey.trim()
      }

      if (editingId) {
        await axios.put(`/api/admin/neighborhoods/${editingId}`, dataToSend, {
          headers: { Authorization: `Bearer ${token}` },
        })
        toast.success('Local atualizado!')
      } else {
        await axios.post('/api/admin/neighborhoods', dataToSend, {
          headers: { Authorization: `Bearer ${token}` },
        })
        toast.success('Local criado!')
      }
      setShowModal(false)
      resetForm()
      fetchNeighborhoods()
    } catch (error: unknown) {
      console.error('Error saving neighborhood:', error)
      const err = error as { response?: { data?: { error?: string; details?: string } } }
      const errorMessage =
        err.response?.data?.error || err.response?.data?.details || 'Erro ao processar'
      toast.error(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = (neighborhood: Neighborhood) => {
    setEditingId(neighborhood.id)
    setFormData({
      name: neighborhood.name,
      displayOrder:
        neighborhood.displayOrder === null || neighborhood.displayOrder === undefined
          ? ''
          : String(neighborhood.displayOrder),
      active: neighborhood.active,
      photoUrl: neighborhood.photoUrl || '',
      externalId: neighborhood.externalId || '',
      saurusDominio: neighborhood.saurusDominio || '',
      saurusPdvKey: '',
      saurusTabPrecoId: neighborhood.saurusTabPrecoId || '',
      saurusSyncEnabled: Boolean(neighborhood.saurusSyncEnabled),
      clearSaurusPdvKey: false,
    })
    setShowModal(true)
  }

  const handleDelete = async () => {
    if (!showDeleteModal) return

    const deletedId = showDeleteModal.id
    try {
      setIsDeleting(true)
      await axios.delete(`/api/admin/neighborhoods/${deletedId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setShowDeleteModal(null)
      setNeighborhoods((prev) => prev.filter((n) => n.id !== deletedId))
      toast.success('Bairro excluído com sucesso!')
      await fetchNeighborhoods({ silent: true })
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      toast.error(err.response?.data?.error || 'Erro ao excluir bairro')
      fetchNeighborhoods({ silent: true })
    } finally {
      setIsDeleting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      displayOrder: '',
      active: true,
      photoUrl: '',
      externalId: '',
      saurusDominio: '',
      saurusPdvKey: '',
      saurusTabPrecoId: '',
      saurusSyncEnabled: false,
      clearSaurusPdvKey: false,
    })
    setEditingId(null)
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploading(true)
      const formDataUpload = new FormData()
      formDataUpload.append('file', file)

      const response = await axios.post('/api/upload', formDataUpload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      })

      setFormData((prev) => ({ ...prev, photoUrl: response.data.imageUrl }))
      toast.success('Imagem enviada!')
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string; details?: string } } }
      const errorMessage = err.response?.data?.error || 'Erro ao enviar imagem'
      const errorDetails = err.response?.data?.details
      toast.error(errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage)
    } finally {
      setUploading(false)
    }
  }

  const runTestConnection = async (id: string, displayName: string) => {
    try {
      setTestingId(id)
      const { data } = await axios.post(
        '/api/integration/saurus/test-connection',
        { neighborhoodId: id },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (data.ok) {
        toast.success(`Conexão OK — ${displayName} (cadastros + estoque).`)
      } else {
        toast.error('Falha parcial na conexão; abra o console de rede para detalhes.')
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err.response?.data?.message || 'Erro ao testar conexão')
    } finally {
      setTestingId(null)
    }
  }

  const runDryRun = async (n: Neighborhood) => {
    try {
      setDryRunId(n.id)
      const { data } = await axios.post(
        `/api/integration/saurus/sync?neighborhoodId=${encodeURIComponent(n.id)}&dryRun=true`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setDryRunResult({
        neighborhoodName: n.name,
        summary: data.summary as SyncSummary,
      })
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err.response?.data?.message || 'Erro na simulação')
    } finally {
      setDryRunId(null)
    }
  }

  const runSyncStream = async (neighborhoodId: string, forceImageRefresh = false) => {
    setSyncOverlay({
      open: true,
      percent: 0,
      label: 'Conectando à Saurus…',
      error: null,
      summary: null,
    })
    // Config: se não estiver explicitamente 'true', não usar stream
    const streamFlag = process.env.NEXT_PUBLIC_SYNC_STREAM === 'true' ? 'true' : 'false'
    const url = `/api/integration/saurus/sync?neighborhoodId=${encodeURIComponent(
      neighborhoodId
    )}&stream=${streamFlag}${forceImageRefresh ? '&forceImageRefresh=true' : ''}`
    try {
      let finalSummary: SyncSummary | null = null

      if (streamFlag === 'true') {
        // Stream com fallback automático para non-stream após timeout
        const controller = new AbortController()
        const fallbackTimer = setTimeout(() => controller.abort(), 8000)
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          })
          if (!res.ok || !res.body) {
            const t = await res.text()
            throw new Error(t || `HTTP ${res.status}`)
          }
          clearTimeout(fallbackTimer)
          const reader = res.body.getReader()
          const decoder = new TextDecoder()
          let buffer = ''
          for (;;) {
            const { done, value } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''
            for (const line of lines) {
              if (!line.trim()) continue
              const msg = JSON.parse(line) as Record<string, unknown>
              if (msg.type === 'progress') {
                setSyncOverlay((prev) => ({
                  ...prev,
                  percent: typeof msg.percent === 'number' ? msg.percent : prev.percent,
                  label: typeof msg.label === 'string' ? msg.label : prev.label,
                  current: typeof msg.current === 'number' ? msg.current : prev.current,
                  total: typeof msg.total === 'number' ? msg.total : prev.total,
                }))
              }
              if (msg.type === 'done') {
                if ((msg as any).ok && (msg as any).summary) {
                  finalSummary = (msg as any).summary as SyncSummary
                } else {
                  throw new Error(typeof (msg as any).error === 'string' ? (msg as any).error : 'Falha na sincronização')
                }
              }
            }
          }
        } catch (err) {
          // Fallback: tenta non-stream
          const res = await fetch(
            `/api/integration/saurus/sync?neighborhoodId=${encodeURIComponent(neighborhoodId)}&stream=false${
              forceImageRefresh ? '&forceImageRefresh=true' : ''
            }`,
            { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
          )
          if (!res.ok) {
            const t = await res.text()
            throw new Error(t || `HTTP ${res.status}`)
          }
          const data = (await res.json()) as { ok: boolean; summary?: SyncSummary }
          if (!data.ok || !data.summary) throw new Error('Falha na sincronização (fallback)')
          finalSummary = data.summary
        } finally {
          clearTimeout(fallbackTimer)
        }
      } else {
        // Non-stream direto
        const res = await fetch(url, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          const t = await res.text()
          throw new Error(t || `HTTP ${res.status}`)
        }
        const data = (await res.json()) as { ok: boolean; summary?: SyncSummary }
        if (!data.ok || !data.summary) throw new Error('Falha na sincronização')
        finalSummary = data.summary
      }

      setSyncOverlay((prev) => ({
        ...prev,
        percent: 100,
        summary: finalSummary,
        label: finalSummary
          ? `Concluído: ${finalSummary.produtosGravados ?? finalSummary.upserts?.upsertedProductPrices ?? 0} produtos gravados neste local.`
          : prev.label,
      }))
      toast.success('Sincronização concluída.')
      fetchNeighborhoods({ silent: true })
      // Fecha automaticamente após breve intervalo para evitar ficar preso na UI
      setTimeout(() => {
        setSyncOverlay({
          open: false,
          percent: 0,
          label: '',
          error: null,
          summary: null,
        })
      }, 1200)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro ao sincronizar'
      setSyncOverlay((prev) => ({ ...prev, error: message, label: 'Erro' }))
      toast.error(message)
    }
  }

  const formatSyncHint = (n: Neighborhood) => {
    if (!n.saurusLastSyncAt) return null
    const d = new Date(n.saurusLastSyncAt)
    const ok = n.saurusLastSyncOk ? 'Sucesso' : 'Falha'
    let durationText = ''
    if (n.saurusLastSyncSummary) {
      try {
        const parsed = JSON.parse(n.saurusLastSyncSummary) as SyncSummary
        const human = formatDuration(parsed?.durationMs)
        if (human) durationText = ` (${human})`
      } catch {
        // ignore parse errors for old summaries
      }
    }
    const extra =
      n.saurusLastSyncMessage && n.saurusLastSyncMessage !== 'OK'
        ? `: ${n.saurusLastSyncMessage}`
        : ''
    return `${d.toLocaleString('pt-BR')} — ${ok}${durationText}${extra}`
  }

  const loadSyncHealth = useCallback(
    async (range: '24h' | '7d') => {
      if (!token) return
      try {
        setSyncHealthLoading(true)
        const { data } = await axios.get('/api/admin/neighborhoods/sync-health', {
          params: { range },
          headers: { Authorization: `Bearer ${token}` },
        })
        setSyncHealth(data as SyncHealthResponse)
      } catch (e) {
        console.error('Erro ao carregar saúde da sync:', e)
        toast.error('Erro ao buscar métricas de sincronização')
      } finally {
        setSyncHealthLoading(false)
      }
    },
    [token]
  )

  const openSyncHealth = async (range: '24h' | '7d' = '24h') => {
    setSyncHealthOpen(true)
    setSyncHealthRange(range)
    await loadSyncHealth(range)
  }

  const clearSyncHealth = async () => {
    if (!token) return

    try {
      setSyncHealthClearing(true)
      await axios.delete('/api/admin/neighborhoods/sync-health', {
        headers: { Authorization: `Bearer ${token}` },
      })
      toast.success('Métricas de sync limpas com sucesso.')
      await loadSyncHealth(syncHealthRange)
      await fetchNeighborhoods({ silent: true })
    } catch (e) {
      console.error('Erro ao limpar métricas de sync:', e)
      toast.error('Erro ao limpar métricas de sincronização')
    } finally {
      setSyncHealthClearing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Locais</h1>
          <p className="text-gray-500">
            Gerencie locais, integração Saurus por unidade e sincronização de estoque/preço
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void openSyncHealth('24h')}
            className="btn-secondary flex items-center gap-2"
          >
            <BarChart3 size={18} />
            Saúde da Sync
          </button>
          <button
            onClick={() => {
              resetForm()
              setShowModal(true)
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            Novo Local
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {neighborhoods.map((neighborhood) => {
            const syncHint = formatSyncHint(neighborhood)
            return (
            <div
              key={neighborhood.id}
              className={`card border-2 transition-all flex flex-col ${neighborhood.active ? 'border-transparent' : 'border-gray-200 opacity-60'}`}
            >
              <div className="relative h-48 bg-gray-100 rounded-xl mb-4 overflow-hidden shrink-0">
                {neighborhood.photoUrl ? (
                  <Image
                    src={neighborhood.photoUrl}
                    alt={neighborhood.name}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-100 to-primary-200">
                    <MapPin className="text-primary-600" size={48} />
                  </div>
                )}
                {!neighborhood.active && (
                  <div className="absolute top-2 right-2 bg-gray-800 text-white text-xs font-bold px-2 py-1 rounded-full">
                    INATIVO
                  </div>
                )}
              </div>

              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg mb-1 truncate">{neighborhood.name}</h3>
                  {neighborhood.saurusSyncEnabled && (
                    <span className="text-xs font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full">
                      Sync automático ativo
                    </span>
                  )}
                  {syncHint && (
                    <p className="text-xs text-gray-500 mt-2 line-clamp-2">{syncHint}</p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => handleEdit(neighborhood)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => setShowDeleteModal({ id: neighborhood.id, name: neighborhood.name })}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Excluir"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="mt-auto flex flex-col gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => runTestConnection(neighborhood.id, neighborhood.name)}
                  disabled={testingId === neighborhood.id || !token}
                  className="w-full py-2.5 px-3 rounded-xl text-sm font-bold border-2 border-emerald-200 text-emerald-800 bg-emerald-50/80 hover:bg-emerald-100 disabled:opacity-40 transition-colors"
                >
                  {testingId === neighborhood.id ? 'Testando…' : 'Testar conexão'}
                </button>
                <button
                  type="button"
                  onClick={() => runDryRun(neighborhood)}
                  disabled={dryRunId === neighborhood.id || !token}
                  className="w-full py-2.5 px-3 rounded-xl text-sm font-bold border-2 border-gray-200 text-gray-800 bg-white hover:bg-gray-50 disabled:opacity-40 transition-colors"
                >
                  {dryRunId === neighborhood.id ? 'Simulando…' : 'Simular sync'}
                </button>
                <button
                  type="button"
                  onClick={() => setSyncConfirm({ id: neighborhood.id, name: neighborhood.name })}
                  disabled={!token}
                  className="w-full py-2.5 px-3 rounded-xl text-sm font-black bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40 shadow-md"
                >
                  Sincronizar agora
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSyncConfirm({
                      id: neighborhood.id,
                      name: neighborhood.name,
                      forceImageRefresh: true,
                    })
                  }
                  disabled={!token}
                  className="w-full py-2.5 px-3 rounded-xl text-sm font-black border-2 border-indigo-200 text-indigo-800 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-40 shadow-sm"
                >
                  Atualizar imagens manualmente
                </button>
              </div>
            </div>
            )
          })}

          {neighborhoods.length === 0 && (
            <div className="col-span-full text-center py-12 bg-white rounded-2xl border-2 border-dashed border-gray-200">
              <div className="text-4xl mb-4">📍</div>
              <p className="text-gray-500">Nenhum local cadastrado.</p>
              <button
                onClick={() => setShowModal(true)}
                className="text-primary-600 font-bold hover:underline mt-2"
              >
                Clique aqui para adicionar o primeiro
              </button>
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        isOpen={!!syncConfirm}
        onClose={() => setSyncConfirm(null)}
        onConfirm={() => {
          if (!syncConfirm) return
          const { id, forceImageRefresh } = syncConfirm
          setSyncConfirm(null)
          void runSyncStream(id, Boolean(forceImageRefresh))
        }}
        title={
          syncConfirm?.forceImageRefresh
            ? 'Atualizar imagens manualmente?'
            : 'Sincronizar com a Saurus?'
        }
        message={
          syncConfirm
            ? syncConfirm.forceImageRefresh
              ? `As imagens dos produtos do local «${syncConfirm.name}» serão verificadas na Saurus e, quando houver imagem no retorno, ela será sobrescrita no catálogo. Isso pode levar alguns minutos.`
              : `Os produtos e o estoque do local «${syncConfirm.name}» serão atualizados com os dados da Saurus. Isso pode levar vários minutos se houver muitos itens.`
            : ''
        }
        confirmText={syncConfirm?.forceImageRefresh ? 'Sim, atualizar imagens' : 'Sim, sincronizar'}
        cancelText="Cancelar"
        type={syncConfirm?.forceImageRefresh ? 'warning' : 'info'}
      />

      {syncOverlay.open && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-xl font-black text-gray-900">Sincronizando</h3>
            {syncOverlay.error ? (
              <p className="text-red-600 text-sm">{syncOverlay.error}</p>
            ) : (
              <>
                <p className="text-sm text-gray-600">{syncOverlay.label}</p>
                <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-600 transition-all duration-300 rounded-full"
                    style={{ width: `${Math.min(100, Math.max(0, syncOverlay.percent))}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  {syncOverlay.current != null && syncOverlay.total != null
                    ? `${syncOverlay.current} de ${syncOverlay.total} linhas processadas`
                    : `${Math.round(syncOverlay.percent)}%`}
                </p>
              </>
            )}
            {syncOverlay.summary && !syncOverlay.error && (
              <div className="text-xs text-gray-600 bg-gray-50 rounded-xl p-3 space-y-1">
                <p>
                  <strong>{syncOverlay.summary.produtos}</strong> produtos no cadastro Saurus (códigos/SKUs
                  diferentes).
                </p>
                <p>
                  Gravados/atualizados nesta sync:{' '}
                  <strong>{syncOverlay.summary.produtosGravados ?? '—'}</strong>
                </p>
                <p>
                  Duração:{' '}
                  <strong>{formatDuration(syncOverlay.summary.durationMs) ?? '—'}</strong>
                </p>
                <p>Avisos: {syncOverlay.summary.warnings?.length ?? 0}</p>
              </div>
            )}
            <button
              type="button"
              className="w-full btn-secondary py-3 disabled:opacity-50"
              disabled={!syncOverlay.error && !syncOverlay.summary}
              onClick={() =>
                setSyncOverlay({
                  open: false,
                  percent: 0,
                  label: '',
                  error: null,
                  summary: null,
                })
              }
            >
              {syncOverlay.error || syncOverlay.summary ? 'Fechar' : 'Aguarde…'}
            </button>
          </div>
        </div>
      )}

      {syncHealthOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-gray-900">Saúde da sincronização</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Taxa de sucesso, falhas por local e últimos erros da integração Saurus.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSyncHealthOpen(false)}
                className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                aria-label="Fechar"
              >
                <X size={22} />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSyncHealthRange('24h')
                    void loadSyncHealth('24h')
                  }}
                  className={`px-3 py-2 rounded-xl text-sm font-bold ${
                    syncHealthRange === '24h'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  24h
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSyncHealthRange('7d')
                    void loadSyncHealth('7d')
                  }}
                  className={`px-3 py-2 rounded-xl text-sm font-bold ${
                    syncHealthRange === '7d'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  7 dias
                </button>
                </div>
                <button
                  type="button"
                  onClick={() => setSyncHealthClearConfirmOpen(true)}
                  disabled={syncHealthClearing || syncHealthLoading}
                  className="px-3 py-2 rounded-xl text-sm font-bold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 disabled:opacity-50"
                >
                  {syncHealthClearing ? 'Limpando…' : 'Limpar métricas'}
                </button>
              </div>

              {syncHealthLoading ? (
                <div className="py-16 text-center text-gray-500">
                  <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
                  <p className="mt-3">Carregando métricas…</p>
                </div>
              ) : syncHealth ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="rounded-2xl border border-gray-200 p-4">
                      <p className="text-xs font-bold text-gray-500 uppercase">Execuções</p>
                      <p className="text-2xl font-black text-gray-900 mt-1">{syncHealth.summary.totalRuns}</p>
                    </div>
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                      <p className="text-xs font-bold text-emerald-700 uppercase">Sucessos</p>
                      <p className="text-2xl font-black text-emerald-900 mt-1">{syncHealth.summary.successes}</p>
                    </div>
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                      <p className="text-xs font-bold text-red-700 uppercase">Falhas</p>
                      <p className="text-2xl font-black text-red-900 mt-1">{syncHealth.summary.failures}</p>
                    </div>
                    <div className="rounded-2xl border border-primary-200 bg-primary-50 p-4">
                      <p className="text-xs font-bold text-primary-700 uppercase">% de sucesso</p>
                      <p className="text-2xl font-black text-primary-900 mt-1">
                        {syncHealth.summary.successRate.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                      <h4 className="font-bold text-gray-900">Falhas por local</h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-500">
                            <th className="py-3 px-4">Local</th>
                            <th className="py-3 px-4">Execuções</th>
                            <th className="py-3 px-4">Falhas</th>
                            <th className="py-3 px-4">% sucesso</th>
                            <th className="py-3 px-4">Duração média</th>
                          </tr>
                        </thead>
                        <tbody>
                          {syncHealth.neighborhoodStats.map((row) => (
                            <tr key={row.id} className="border-b border-gray-50">
                              <td className="py-3 px-4 font-semibold text-gray-900">{row.name}</td>
                              <td className="py-3 px-4">{row.total}</td>
                              <td className="py-3 px-4">
                                <span className={row.failures > 0 ? 'font-bold text-red-700' : 'text-gray-500'}>
                                  {row.failures}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                {row.successRate == null ? '—' : `${row.successRate.toFixed(1)}%`}
                              </td>
                              <td className="py-3 px-4">{formatDuration(row.avgDurationMs) ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                      <AlertTriangle size={16} className="text-amber-600" />
                      <h4 className="font-bold text-gray-900">Últimos erros resumidos</h4>
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {syncHealth.recentErrors.length === 0 ? (
                        <p className="p-4 text-sm text-gray-500">Nenhum erro no período selecionado.</p>
                      ) : (
                        <ul className="divide-y divide-gray-100">
                          {syncHealth.recentErrors.map((e) => (
                            <li key={e.id} className="p-4 text-sm">
                              <p className="font-semibold text-gray-900">
                                {e.neighborhoodName} · {new Date(e.finishedAt).toLocaleString('pt-BR')}
                              </p>
                              <p className="text-gray-600 mt-1 line-clamp-3">{e.message}</p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-center text-gray-500 py-12">Sem dados de sincronização no período.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {dryRunResult && (
        <div className="fixed inset-0 z-[105] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl my-8 max-h-[90vh] overflow-y-auto space-y-5">
            <h3 className="text-xl font-black">Resultado da simulação — {dryRunResult.neighborhoodName}</h3>
            <p className="text-base text-gray-800 font-medium leading-relaxed">
              {dryRunResult.summary.produtos} Produtos encontrados (quantidade de cadastros de produto)
            </p>
            <ul className="text-sm space-y-2 text-gray-800">
              <li>Produtos cadastrados: {dryRunResult.summary.produtos}</li>
              <li>Produtos com preço: {dryRunResult.summary.precos}</li>
              <li>Total de produtos no estoque: {dryRunResult.summary.estoques}</li>
            </ul>
            {dryRunResult.summary.warnings?.length > 0 && (
              <div className="text-xs text-amber-900 bg-amber-50 rounded-xl p-3">
                {dryRunResult.summary.warnings.map((w, i) => (
                  <p key={i}>{w}</p>
                ))}
              </div>
            )}
            <button type="button" className="w-full btn-primary py-3" onClick={() => setDryRunResult(null)}>
              Fechar
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={syncHealthClearConfirmOpen}
        onClose={() => setSyncHealthClearConfirmOpen(false)}
        onConfirm={async () => {
          setSyncHealthClearConfirmOpen(false)
          await clearSyncHealth()
        }}
        title="Limpar métricas da Saúde da Sync?"
        message="Isso vai apagar todo o histórico de execuções da Saúde da Sync e limpar o status de última sincronização exibido nos locais. Não remove produtos, preços ou estoque."
        confirmText="Sim, limpar métricas"
        cancelText="Cancelar"
        type="warning"
        isLoading={syncHealthClearing}
        zIndex={130}
      />

      <ConfirmModal
        isOpen={!!showDeleteModal}
        onClose={() => setShowDeleteModal(null)}
        onConfirm={handleDelete}
        title="Excluir Local?"
        message={`Tem certeza que deseja excluir o local "${showDeleteModal?.name}"? Esta ação não pode ser desfeita.`}
        confirmText="Sim, Excluir"
        cancelText="Cancelar"
        type="danger"
        isLoading={isDeleting}
      />

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="p-8 overflow-y-auto flex-1">
              <h2 className="text-2xl font-black mb-6">
                {editingId ? 'Editar Local' : 'Novo Local'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">
                    Nome do Local *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Condomínio 1, Condomínio 2..."
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">
                    Ordem de exibição (opcional)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={formData.displayOrder}
                    onChange={(e) => setFormData({ ...formData, displayOrder: e.target.value })}
                    placeholder="Ex: 1 (aparece primeiro)"
                    className="input-field"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Menor número aparece primeiro. Em branco = ordem alfabética.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">
                    Foto do Condomínio
                  </label>
                  <div className="space-y-2">
                    <input
                      type="file"
                      onChange={handleUpload}
                      accept="image/*"
                      className="hidden"
                      id="photo-upload"
                      disabled={uploading}
                    />
                    <label
                      htmlFor="photo-upload"
                      className="btn-secondary inline-flex items-center gap-2 cursor-pointer w-full justify-center"
                    >
                      <Upload size={20} />
                      {uploading ? 'Enviando...' : 'Upload Foto'}
                    </label>
                    {formData.photoUrl && (
                      <div className="relative w-full h-48 bg-gray-100 rounded-xl overflow-hidden">
                        <Image
                          src={formData.photoUrl}
                          alt="Preview"
                          fill
                          sizes="(max-width: 768px) 100vw, 400px"
                          className="object-contain"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="active"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="active" className="text-sm font-bold text-gray-700 cursor-pointer">
                    Condomínio Ativo
                  </label>
                </div>

                <div className="border-t border-gray-100 pt-5 space-y-4">
                  <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider">
                    Integração Saurus
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Integração fixa <strong>SAURUS</strong>. O token SOAP fica no servidor (
                    <code className="bg-gray-100 px-1 rounded">SAURUS_TOKEN</code>). Domínio e chave de caixa: se
                    deixar em branco, usam os valores do .env (
                    <code className="bg-gray-100 px-1 rounded">SAURUS_DOMINIO</code>,{' '}
                    <code className="bg-gray-100 px-1 rounded">SAURUS_PDV_KEY</code>). Ao editar,{' '}
                    <strong>deixe a chave em branco para manter</strong> a já salva.
                  </p>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      ID da loja na Saurus (idLoja) — filtro de estoque
                    </label>
                    <input
                      type="text"
                      value={formData.externalId}
                      onChange={(e) => setFormData({ ...formData, externalId: e.target.value })}
                      className="input-field"
                      placeholder="Ex: código da loja Morada do Verde"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Domínio Saurus (opcional)</label>
                    <input
                      type="text"
                      value={formData.saurusDominio}
                      onChange={(e) => setFormData({ ...formData, saurusDominio: e.target.value })}
                      className="input-field"
                      placeholder="Vazio = usar SAURUS_DOMINIO do .env"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Chave caixa (opcional)</label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={formData.saurusPdvKey}
                      onChange={(e) => setFormData({ ...formData, saurusPdvKey: e.target.value })}
                      className="input-field"
                      placeholder={
                        editingId
                          ? 'Em branco = manter chave atual'
                          : 'Vazio = usar SAURUS_PDV_KEY do .env'
                      }
                    />
                    {editingId && (
                      <label className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                        <input
                          type="checkbox"
                          checked={formData.clearSaurusPdvKey}
                          onChange={(e) =>
                            setFormData({ ...formData, clearSaurusPdvKey: e.target.checked })
                          }
                        />
                        Remover chave salva neste local (passar a usar só o .env)
                      </label>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      ID tabela de preço (opcional)
                    </label>
                    <input
                      type="text"
                      value={formData.saurusTabPrecoId}
                      onChange={(e) => setFormData({ ...formData, saurusTabPrecoId: e.target.value })}
                      className="input-field"
                      placeholder="pro_idTabPreco — vazio = primeiro preço encontrado"
                    />
                  </div>
                  <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 space-y-2">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="saurusSyncEnabled"
                        checked={formData.saurusSyncEnabled}
                        onChange={(e) =>
                          setFormData({ ...formData, saurusSyncEnabled: e.target.checked })
                        }
                        className="w-5 h-5 mt-0.5 rounded border-gray-300 text-primary-600"
                      />
                      <div>
                        <label htmlFor="saurusSyncEnabled" className="text-sm font-bold text-gray-900 cursor-pointer">
                          Incluir no sync automático (cron)
                        </label>
                        <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                          Quando marcado, este local entra na fila que o servidor executa sozinho em horários
                          programados (ex.: a cada poucas horas na hospedagem), sem precisar clicar em
                          «Sincronizar agora». Exige variável <code className="bg-white/80 px-1 rounded">CRON_SECRET</code>{' '}
                          configurada no ambiente de produção.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button type="submit" className="btn-primary flex-1 py-4 text-lg" disabled={isSaving}>
                    {isSaving ? (
                      <div className="h-6 w-6 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                    ) : editingId ? (
                      'Salvar Alterações'
                    ) : (
                      'Cadastrar Condomínio'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      resetForm()
                    }}
                    className="btn-secondary px-6"
                    disabled={isSaving}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
