'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import axios from 'axios'
import { Download, Upload, AlertTriangle, CheckCircle, FileJson, Database, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import ConfirmModal from '@/components/ConfirmModal'

interface SavedBackup {
  id: string
  notes: string | null
  createdBy: string | null
  createdAt: string
  size: number
}

export default function BackupPage() {
  const { token, user } = useAuth()
  const [isDownloading, setIsDownloading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [showRestoreModal, setShowRestoreModal] = useState(false)
  const [backupFile, setBackupFile] = useState<File | null>(null)
  const [clearExisting, setClearExisting] = useState(false)
  const [savedBackups, setSavedBackups] = useState<SavedBackup[]>([])
  const [isLoadingBackups, setIsLoadingBackups] = useState(false)
  const [showAddToLibraryModal, setShowAddToLibraryModal] = useState(false)
  const [libraryBackupFile, setLibraryBackupFile] = useState<File | null>(null)
  const [libraryNotes, setLibraryNotes] = useState('')
  const [isAddingToLibrary, setIsAddingToLibrary] = useState(false)

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
        `Backup restaurado! ${response.data.restored.products} produtos, ${response.data.restored.categories} categorias, ${response.data.restored.admins} administradores.`
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

  // Carregar backups salvos
  const loadSavedBackups = async () => {
    try {
      setIsLoadingBackups(true)
      const response = await axios.get('/api/admin/backup/library', {
        headers: { Authorization: `Bearer ${token}` },
      })
      setSavedBackups(response.data.backups || [])
    } catch (error: any) {
      console.error('Load backups error:', error)
      toast.error('Erro ao carregar backups salvos')
    } finally {
      setIsLoadingBackups(false)
    }
  }

  useEffect(() => {
    loadSavedBackups()
  }, [])

  // Adicionar backup à biblioteca
  const handleLibraryFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
        toast.error('Por favor, selecione um arquivo JSON válido')
        return
      }
      setLibraryBackupFile(file)
      setShowAddToLibraryModal(true)
    }
  }

  const handleAddToLibrary = async () => {
    if (!libraryBackupFile) return

    try {
      setIsAddingToLibrary(true)
      
      // Ler arquivo
      const text = await libraryBackupFile.text()
      const backup = JSON.parse(text)

      // Validar formato
      if (!backup.data || !backup.version || !backup.createdAt) {
        toast.error('Formato de backup inválido')
        return
      }

      // Enviar para API
      await axios.post(
        '/api/admin/backup/library',
        {
          backup,
          notes: libraryNotes.trim() || null,
          createdBy: user?.name || null,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      toast.success('Backup adicionado à biblioteca com sucesso!')
      
      setLibraryBackupFile(null)
      setLibraryNotes('')
      setShowAddToLibraryModal(false)
      
      // Limpar input e recarregar lista
      const fileInput = document.getElementById('library-backup-file') as HTMLInputElement
      if (fileInput) fileInput.value = ''
      loadSavedBackups()
    } catch (error: any) {
      console.error('Add to library error:', error)
      toast.error(error.response?.data?.error || 'Erro ao adicionar backup à biblioteca')
    } finally {
      setIsAddingToLibrary(false)
    }
  }

  // Baixar backup da biblioteca
  const handleDownloadFromLibrary = async (backupId: string) => {
    try {
      const response = await axios.get(`/api/admin/backup/library/${backupId}`, {
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
      console.error('Download from library error:', error)
      toast.error(error.response?.data?.error || 'Erro ao baixar backup')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
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
                <li>Dados de acesso dos administradores</li>
                <li>Categorias</li>
                <li>Produtos e preços</li>
                <li>Condomínios</li>
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

      {/* Seção: Biblioteca de Backups */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
            <Database size={24} />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">Biblioteca de Backups</h2>
            <p className="text-sm text-gray-600">
              Adicione backups manualmente para manter os últimos 3 salvos na aplicação
            </p>
          </div>
        </div>

        {/* Adicionar à Biblioteca */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border-2 border-dashed">
          <label
            htmlFor="library-backup-file"
            className="block w-full btn-primary text-center cursor-pointer flex items-center justify-center gap-2 mb-3"
          >
            <Plus size={20} />
            Adicionar Backup à Biblioteca
          </label>
          <input
            id="library-backup-file"
            type="file"
            accept=".json,application/json"
            onChange={handleLibraryFileSelect}
            className="hidden"
          />
          <p className="text-xs text-gray-500 text-center">
            Selecione um arquivo JSON de backup para adicionar à biblioteca
          </p>
        </div>

        {/* Lista de Backups Salvos */}
        {isLoadingBackups ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : savedBackups.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed">
            <Database size={48} className="mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600 font-medium">Nenhum backup salvo</p>
            <p className="text-sm text-gray-500 mt-1">
              Adicione um backup acima para começar
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {savedBackups.map((backup) => (
              <div
                key={backup.id}
                className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FileJson size={20} className="text-primary-600" />
                      <span className="font-bold text-gray-900">
                        {formatDate(backup.createdAt)}
                      </span>
                      <span className="text-sm text-gray-500">
                        ({formatSize(backup.size)})
                      </span>
                    </div>
                    {backup.notes && (
                      <p className="text-sm text-gray-600 mb-2">
                        <strong>Observações:</strong> {backup.notes}
                      </p>
                    )}
                    {backup.createdBy && (
                      <p className="text-xs text-gray-500">
                        Adicionado por: {backup.createdBy}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDownloadFromLibrary(backup.id)}
                    className="btn-primary flex items-center gap-2 px-4 py-2"
                  >
                    <Download size={18} />
                    Baixar
                  </button>
                </div>
              </div>
            ))}
            <p className="text-xs text-gray-500 text-center mt-4">
              Mantendo os 3 backups mais recentes. Ao adicionar um 4º, o mais antigo será removido automaticamente.
            </p>
          </div>
        )}
      </div>

      {/* Modal: Adicionar Backup à Biblioteca */}
      <ConfirmModal
        isOpen={showAddToLibraryModal}
        onClose={() => {
          setShowAddToLibraryModal(false)
          setLibraryBackupFile(null)
          setLibraryNotes('')
          const fileInput = document.getElementById('library-backup-file') as HTMLInputElement
          if (fileInput) fileInput.value = ''
        }}
        onConfirm={handleAddToLibrary}
        title="Adicionar Backup à Biblioteca"
        message={
          <div className="space-y-4">
            {libraryBackupFile && (
              <div className="bg-gray-50 border rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm">
                  <FileJson size={16} className="text-gray-600" />
                  <span className="font-medium">{libraryBackupFile.name}</span>
                  <span className="text-gray-500">
                    ({(libraryBackupFile.size / 1024).toFixed(2)} KB)
                  </span>
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observações (opcional):
              </label>
              <textarea
                value={libraryNotes}
                onChange={(e) => setLibraryNotes(e.target.value)}
                placeholder="Ex: Antes de importar Excel, Backup diário, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                rows={3}
              />
            </div>
            <p className="text-sm text-gray-600">
              Data e hora serão registradas automaticamente. Se já houver 3 backups, o mais antigo será removido.
            </p>
          </div>
        }
        confirmText={isAddingToLibrary ? 'Adicionando...' : 'Adicionar à Biblioteca'}
        cancelText="Cancelar"
        type="info"
        disabled={isAddingToLibrary}
      />

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
