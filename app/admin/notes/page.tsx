'use client'

import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import { StickyNote, Plus, Pencil, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import ConfirmModal from '@/components/ConfirmModal'

type AdminNote = {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

function apiErrorMessage(e: unknown, fallback: string): string {
  if (!axios.isAxiosError(e) || !e.response?.data) return fallback
  const d = e.response.data as { error?: string; debug?: string }
  let m = d.error ? String(d.error) : fallback
  if (d.debug) m += ` — ${String(d.debug).slice(0, 220)}`
  return m
}

export default function AdminNotesPage() {
  const { token } = useAuth()
  const [notes, setNotes] = useState<AdminNote[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formTitle, setFormTitle] = useState('')
  const [formContent, setFormContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadNotes = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const { data } = await axios.get<AdminNote[]>('/api/admin/notes', {
        headers: { Authorization: `Bearer ${token}` },
      })
      setNotes(Array.isArray(data) ? data : [])
    } catch (e: unknown) {
      toast.error(apiErrorMessage(e, 'Não foi possível carregar as anotações'))
      setNotes([])
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadNotes()
  }, [loadNotes])

  const openCreate = () => {
    setEditingId(null)
    setFormTitle('')
    setFormContent('')
    setModalOpen(true)
  }

  const openEdit = (n: AdminNote) => {
    setEditingId(n.id)
    setFormTitle(n.title)
    setFormContent(n.content)
    setModalOpen(true)
  }

  const closeModal = () => {
    if (saving) return
    setModalOpen(false)
    setEditingId(null)
  }

  const handleSave = async () => {
    const title = formTitle.trim()
    if (!title) {
      toast.error('Informe um título')
      return
    }
    setSaving(true)
    try {
      if (editingId) {
        await axios.put(
          `/api/admin/notes/${editingId}`,
          { title, content: formContent },
          { headers: { Authorization: `Bearer ${token}` } }
        )
        toast.success('Anotação atualizada')
      } else {
        await axios.post(
          '/api/admin/notes',
          { title, content: formContent },
          { headers: { Authorization: `Bearer ${token}` } }
        )
        toast.success('Anotação criada')
      }
      setModalOpen(false)
      setEditingId(null)
      await loadNotes()
    } catch (e: unknown) {
      toast.error(apiErrorMessage(e, 'Erro ao salvar'))
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await axios.delete(`/api/admin/notes/${deleteId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      toast.success('Anotação excluída')
      setDeleteId(null)
      await loadNotes()
    } catch (e: unknown) {
      toast.error(apiErrorMessage(e, 'Não foi possível excluir'))
    } finally {
      setDeleting(false)
    }
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 flex items-center gap-2">
            <StickyNote className="text-primary-600 shrink-0" size={32} />
            Anotações
          </h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Registre lembretes e observações rápidas. Somente você vê as suas anotações.
          </p>
        </div>
        <button type="button" onClick={openCreate} className="btn-primary inline-flex items-center justify-center gap-2 shrink-0">
          <Plus size={20} />
          Criar anotação
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Carregando…</p>
      ) : notes.length === 0 ? (
        <div className="card border-2 border-dashed border-gray-200 text-center py-14 text-gray-500">
          <StickyNote className="mx-auto mb-3 text-gray-300" size={48} />
          <p className="font-medium">Nenhuma anotação ainda.</p>
          <p className="text-sm mt-1">Clique em &quot;Criar anotação&quot; para começar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {notes.map((n) => (
            <article
              key={n.id}
              className="card bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h2 className="font-bold text-gray-900 text-lg leading-snug pr-2 flex-1 min-w-0">{n.title}</h2>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEdit(n)}
                    className="p-2 rounded-lg text-gray-500 hover:bg-primary-50 hover:text-primary-700 transition"
                    title="Editar"
                    aria-label="Editar anotação"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteId(n.id)}
                    className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-700 transition"
                    title="Excluir"
                    aria-label="Excluir anotação"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              {n.content ? (
                <p className="text-gray-700 text-sm whitespace-pre-wrap flex-1 mb-3">{n.content}</p>
              ) : (
                <p className="text-gray-400 text-sm italic mb-3">Sem conteúdo</p>
              )}
              <p className="text-xs text-gray-400 mt-auto pt-2 border-t border-gray-100">
                Criada em {formatDate(n.createdAt)}
              </p>
            </article>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-lg text-gray-900">
                {editingId ? 'Editar anotação' : 'Nova anotação'}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
                aria-label="Fechar"
              >
                <X size={22} />
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Título</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="input-field w-full"
                  placeholder="Ex.: Lembrete sobre preços"
                  maxLength={200}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Conteúdo</label>
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  className="input-field w-full min-h-[160px] resize-y"
                  placeholder="Escreva sua anotação…"
                />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button type="button" onClick={closeModal} disabled={saving} className="px-4 py-2 rounded-xl font-medium text-gray-700 hover:bg-gray-100">
                Cancelar
              </button>
              <button type="button" onClick={handleSave} disabled={saving} className="btn-primary px-5 py-2">
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => !deleting && setDeleteId(null)}
        onConfirm={confirmDelete}
        title="Excluir anotação?"
        message="Esta ação não pode ser desfeita."
        confirmText="Excluir"
        type="danger"
        isLoading={deleting}
      />
    </div>
  )
}
