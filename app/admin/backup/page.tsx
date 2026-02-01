'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import axios from 'axios'
import { Download, Upload, AlertTriangle, CheckCircle, FileJson } from 'lucide-react'
import toast from 'react-hot-toast'
import ConfirmModal from '@/components/ConfirmModal'

export default function BackupPage() {
  const { token } = useAuth()
  const [isDownloading, setIsDownloading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [showRestoreModal, setShowRestoreModal] = useState(false)
  const [backupFile, setBackupFile] = useState<File | null>(null)
  const [clearExisting, setClearExisting] = useState(false)

  const handleDownloadBackup = async () => {
    try {
      setIsDownloading(true)
      const response = await axios.get('/api/admin/backup', {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      })

      // Criar link de download
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `backup-${new Date().toISOString().split('T')[0]}.json`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      toast.success('Backup baixado com sucesso!')
    } catch (error: any) {
      console.error('Backup download error:', error)
      toast.error(error.response?.data?.error || 'Erro ao fazer backup')
    } finally {
      setIsDownloading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
        toast.error('Por favor, selecione um arquivo JSON válido')
        return
      }
      setBackupFile(file)
      setShowRestoreModal(true)
    }
  }

  const handleRestoreBackup = async () => {
    if (!backupFile) return

    try {
      setIsUploading(true)
      
      // Ler arquivo
      const text = await backupFile.text()
      const backup = JSON.parse(text)

      // Validar formato
      if (!backup.data) {
        toast.error('Formato de backup inválido')
        return
      }

      // Enviar para API
      const response = await axios.post(
        '/api/admin/backup',
        { backup, clearExisting },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      toast.success(
        `Backup restaurado! ${response.data.restored.products} produtos, ${response.data.restored.categories} categorias, ${response.data.restored.users} usuários.`
      )

      setBackupFile(null)
      setShowRestoreModal(false)
      setClearExisting(false)
      
      // Limpar input
      const fileInput = document.getElementById('backup-file') as HTMLInputElement
      if (fileInput) fileInput.value = ''
    } catch (error: any) {
      console.error('Restore error:', error)
      toast.error(error.response?.data?.error || 'Erro ao restaurar backup')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Backup e Restauração</h1>
          <p className="text-gray-600 mt-1">
            Faça backup dos seus dados ou restaure um backup anterior
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Card: Fazer Backup */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
              <Download size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Fazer Backup</h2>
              <p className="text-sm text-gray-600">Exportar todos os dados do sistema</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>O backup inclui:</strong>
              </p>
              <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
                <li>Usuários e administradores</li>
                <li>Categorias</li>
                <li>Produtos e preços</li>
                <li>Condomínios</li>
                <li>Pedidos</li>
                <li>Favoritos</li>
                <li>Configurações</li>
              </ul>
            </div>

            <button
              onClick={handleDownloadBackup}
              disabled={isDownloading}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              {isDownloading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Gerando backup...
                </>
              ) : (
                <>
                  <Download size={20} />
                  Baixar Backup
                </>
              )}
            </button>
          </div>
        </div>

        {/* Card: Restaurar Backup */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-xl">
              <Upload size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Restaurar Backup</h2>
              <p className="text-sm text-gray-600">Importar dados de um backup anterior</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <strong>Atenção:</strong> A restauração pode sobrescrever dados existentes.
                  Recomendamos fazer um backup antes de restaurar.
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="backup-file"
                className="block w-full btn-primary text-center cursor-pointer flex items-center justify-center gap-2"
              >
                <FileJson size={20} />
                Selecionar Arquivo de Backup
              </label>
              <input
                id="backup-file"
                type="file"
                accept=".json,application/json"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {backupFile && (
              <div className="bg-gray-50 border rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm">
                  <FileJson size={16} className="text-gray-600" />
                  <span className="font-medium">{backupFile.name}</span>
                  <span className="text-gray-500">
                    ({(backupFile.size / 1024).toFixed(2)} KB)
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Confirmação de Restauração */}
      <ConfirmModal
        isOpen={showRestoreModal}
        onClose={() => {
          setShowRestoreModal(false)
          setBackupFile(null)
          const fileInput = document.getElementById('backup-file') as HTMLInputElement
          if (fileInput) fileInput.value = ''
        }}
        onConfirm={handleRestoreBackup}
        title="Confirmar Restauração de Backup"
        message={
          <div className="space-y-3">
            <p>
              Você está prestes a restaurar um backup. Isso pode sobrescrever dados existentes.
            </p>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={clearExisting}
                onChange={(e) => setClearExisting(e.target.checked)}
                className="w-4 h-4 text-primary-600"
              />
              <span className="text-sm">
                <strong>Limpar dados existentes antes de restaurar</strong>
                <br />
                <span className="text-gray-600">
                  (Marca esta opção para uma restauração completa. Se não marcar, os dados serão
                  mesclados com os existentes)
                </span>
              </span>
            </label>
            <div className="bg-red-50 border border-red-200 rounded p-3 mt-3">
              <p className="text-sm text-red-800">
                <strong>⚠️ Atenção:</strong> Esta ação não pode ser desfeita facilmente. Certifique-se
                de ter um backup atual antes de continuar.
              </p>
            </div>
          </div>
        }
        confirmText={isUploading ? 'Restaurando...' : 'Sim, Restaurar Backup'}
        cancelText="Cancelar"
        type="danger"
        disabled={isUploading}
      />
    </div>
  )
}
