'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import axios from 'axios'
import { Plus, Edit, Trash2, MapPin, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import ConfirmModal from '@/components/ConfirmModal'
import Image from 'next/image'

interface Neighborhood {
  id: string
  name: string
  active: boolean
  photoUrl?: string
}

export default function NeighborhoodsPage() {
  const { token } = useAuth()
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([])
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState<{ id: string, name: string } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    active: true,
    photoUrl: ''
  })
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetchNeighborhoods()
  }, [])

  const fetchNeighborhoods = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/admin/neighborhoods')
      const sorted = response.data.sort((a: Neighborhood, b: Neighborhood) => 
        a.name.localeCompare(b.name)
      )
      setNeighborhoods(sorted)
    } catch (error) {
      console.error('Error fetching neighborhoods:', error)
      toast.error('Erro ao buscar locais')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validação do nome
    if (!formData.name || formData.name.trim() === '') {
      toast.error('O nome do condomínio é obrigatório')
      return
    }

    try {
      setIsSaving(true)
      
      // Preparar dados para envio
      const dataToSend: any = {
        name: formData.name.trim(),
        active: formData.active,
      }
      
      // Sempre incluir photoUrl quando estiver presente (nova foto ou para manter existente)
      // Se não tiver photoUrl, não incluir (não alterará a foto existente)
      if (formData.photoUrl) {
        dataToSend.photoUrl = formData.photoUrl.trim()
      }
      
      console.log('Dados sendo enviados:', JSON.stringify(dataToSend, null, 2))
      
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
    } catch (error: any) {
      console.error('Error saving neighborhood:', error)
      const errorMessage = error.response?.data?.error || error.response?.data?.details || 'Erro ao processar'
      toast.error(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = (neighborhood: Neighborhood) => {
    setEditingId(neighborhood.id)
    setFormData({
      name: neighborhood.name,
      active: neighborhood.active,
      photoUrl: neighborhood.photoUrl || ''
    })
    setShowModal(true)
  }

  const handleDelete = async () => {
    if (!showDeleteModal) return

    try {
      setIsDeleting(true)
      await axios.delete(`/api/admin/neighborhoods/${showDeleteModal.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      toast.success('Bairro excluído com sucesso!')
      setShowDeleteModal(null)
      fetchNeighborhoods()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao excluir bairro')
    } finally {
      setIsDeleting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      active: true,
      photoUrl: ''
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
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao enviar imagem')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Condomínios</h1>
          <p className="text-gray-500">Gerencie os condomínios, edite nomes e adicione fotos</p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setShowModal(true)
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          Novo Condomínio
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {neighborhoods.map((neighborhood) => (
            <div key={neighborhood.id} className={`card border-2 transition-all ${neighborhood.active ? 'border-transparent' : 'border-gray-200 opacity-60'}`}>
              <div className="relative h-48 bg-gray-100 rounded-xl mb-4 overflow-hidden">
                {neighborhood.photoUrl ? (
                  <Image
                    src={neighborhood.photoUrl}
                    alt={neighborhood.name}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover"
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
              
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1">{neighborhood.name}</h3>
                </div>
                <div className="flex gap-1">
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
            </div>
          ))}

          {neighborhoods.length === 0 && (
            <div className="col-span-full text-center py-12 bg-white rounded-2xl border-2 border-dashed border-gray-200">
              <div className="text-4xl mb-4">📍</div>
              <p className="text-gray-500">Nenhum condomínio cadastrado.</p>
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

      {/* Modal */}
      <ConfirmModal
        isOpen={!!showDeleteModal}
        onClose={() => setShowDeleteModal(null)}
        onConfirm={handleDelete}
        title="Excluir Condomínio?"
        message={`Tem certeza que deseja excluir o condomínio "${showDeleteModal?.name}"? Esta ação não pode ser desfeita.`}
        confirmText="Sim, Excluir"
        cancelText="Cancelar"
        type="danger"
        isLoading={isDeleting}
      />

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8">
              <h2 className="text-2xl font-black mb-6">
                {editingId ? 'Editar Condomínio' : 'Novo Condomínio'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">
                    Nome do Condomínio *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Ex: Condomínio 1, Condomínio 2..."
                    className="input-field"
                    required
                  />
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
                          className="object-cover"
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

                <div className="flex gap-3 pt-4">
                  <button type="submit" className="btn-primary flex-1 py-4 text-lg" disabled={isSaving}>
                    {isSaving ? (
                      <div className="h-6 w-6 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                    ) : (
                      editingId ? 'Salvar Alterações' : 'Cadastrar Condomínio'
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
