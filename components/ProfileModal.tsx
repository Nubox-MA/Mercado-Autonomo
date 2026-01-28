'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Camera, Upload, X } from 'lucide-react'

interface ProfileModalProps {
  open: boolean
  onClose: () => void
}

export default function ProfileModal({ open, onClose }: ProfileModalProps) {
  const { token, user, updateUser } = useAuth()
  const [photoPreview, setPhotoPreview] = useState<string>(user?.photoUrl || '')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setPhotoPreview(user?.photoUrl || '')
    setSelectedFile(null)
  }, [open, user])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!token) return
    try {
      setIsSubmitting(true)
      let uploadedPhoto = photoPreview

      if (selectedFile) {
        const uploadData = new FormData()
        uploadData.append('file', selectedFile)
        const transport = await axios.post('/api/upload', uploadData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        })
        uploadedPhoto = transport.data.imageUrl
      }

      const payload: Record<string, any> = {
        photoUrl: uploadedPhoto || null,
      }

      const response = await axios.put('/api/auth/me', payload, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.data?.user) {
        updateUser(response.data.user)
      }

      toast.success('Dados salvos com sucesso!')
      onClose()
    } catch (error: any) {
      console.error('Erro ao atualizar perfil', error)
      toast.error(error.response?.data?.error || 'Não foi possível salvar os dados')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold">Meus Dados</h2>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-900">
            <X size={20} />
          </button>
        </div>

        <form className="space-y-4 p-6" onSubmit={handleSubmit}>
          <div className="flex flex-col items-center gap-3">
            <div className="relative w-24 h-24 rounded-full border border-gray-200 overflow-hidden">
              {photoPreview ? (
                <img src={photoPreview} alt="Foto do cliente" className="w-full h-full object-cover" />
              ) : (
                <div className="flex items-center justify-center w-full h-full bg-gray-100 text-3xl text-gray-400">
                  🙂
                </div>
              )}
            </div>
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full border border-green-200 cursor-pointer">
              <Camera size={16} />
              <span className="text-sm font-bold">Selecionar foto</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition"
            >
              Fechar
            </button>
            <button
              type="submit"
              className="px-5 py-3 rounded-xl bg-primary-600 text-white font-bold shadow-lg transition hover:bg-primary-700 disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Salvando...' : 'Salvar dados'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
