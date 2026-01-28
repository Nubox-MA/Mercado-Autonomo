'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import axios from 'axios'
import { User, Trash2, X, AlertTriangle, Phone, Eye, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'
import ConfirmModal from '@/components/ConfirmModal'

interface UserData {
  id: string
  name: string
  cpf?: string
  phone?: string
  role: string
  createdAt: string
  lastLogin?: string
  photoUrl?: string | null
  address?: string | null
  neighborhood?: {
    name: string
  } | null
}

export default function UsersPage() {
  const { token } = useAuth()
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; userId: string; userName: string }>({
    open: false,
    userId: '',
    userName: ''
  })
  const [deleting, setDeleting] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      })
      setUsers(response.data.users)
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
    }
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`
    }
    return phone
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatLastLogin = (date?: string) => {
    if (!date) return 'Nunca acessou'
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const confirmDelete = (userId: string, userName: string) => {
    setDeleteModal({ open: true, userId, userName })
  }

  const handleDeleteUser = async () => {
    if (!deleteModal.userId) return

    try {
      setDeleting(true)
      await axios.delete(`/api/admin/users/${deleteModal.userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      
      toast.success('Cliente excluído com sucesso!')
      setDeleteModal({ open: false, userId: '', userName: '' })
      fetchUsers()
    } catch (error: any) {
      console.error('Error deleting user:', error)
      toast.error(error.response?.data?.error || 'Erro ao excluir cliente')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Clientes Cadastrados</h1>
          <p className="text-gray-500 mt-1">
            Gerencie os clientes que utilizam o mercado
          </p>
        </div>
        <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-gray-100 text-center">
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Total de clientes</p>
          <p className="text-3xl font-black text-primary-600">
            {users.filter((u) => u.role === 'USER').length}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100">
          <div className="h-12 w-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4" />
          <p className="text-gray-500 font-medium">Carregando clientes...</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Nome</th>
                  <th className="text-left py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Telefone</th>
                  <th className="text-left py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Último Acesso</th>
                  <th className="text-center py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users
                  .filter((user) => user.role === 'USER')
        .map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setSelectedUser(user)}
                            className="w-11 h-11 bg-primary-50 rounded-full flex items-center justify-center text-primary-600 font-bold border border-primary-100 p-0 overflow-hidden hover:scale-105 transition-transform"
                          >
                            {user.photoUrl ? (
                              <img src={user.photoUrl} alt={user.name} className="object-cover w-full h-full" />
                            ) : (
                              user.name.charAt(0)
                            )}
                          </button>
                          <span className="font-bold text-gray-800">{user.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2 text-gray-600 font-medium">
                          <Phone size={14} className="text-gray-400" />
                          {user.phone ? formatPhone(user.phone) : 'Não informado'}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-700">{formatLastLogin(user.lastLogin)}</span>
                          <span className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">
                            Entrou em {formatDate(user.createdAt)}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => setSelectedUser(user)}
                            className="text-primary-600 hover:bg-primary-50 p-2.5 rounded-xl transition-all active:scale-90"
                            title="Ver detalhes"
                          >
                            <Eye size={20} />
                          </button>
                          <button
                            onClick={() => confirmDelete(user.id, user.name)}
                            className="text-red-500 hover:bg-red-50 p-2.5 rounded-xl transition-all active:scale-90"
                            title="Excluir morador"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {users.filter(u => u.role === 'USER').length === 0 && (
            <div className="text-center py-20">
              <div className="text-4xl mb-4 opacity-20">👥</div>
              <p className="text-gray-400 font-medium">Nenhum cliente cadastrado ainda.</p>
            </div>
          )}
        </div>
      )}

      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="relative h-48 bg-primary-600 flex items-center justify-center">
              <button
                onClick={() => setSelectedUser(null)}
                className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-colors z-10"
              >
                <X size={20} />
              </button>
              
              {selectedUser.photoUrl ? (
                <img 
                  src={selectedUser.photoUrl} 
                  alt={selectedUser.name} 
                  className="w-full h-full object-cover opacity-50"
                />
              ) : (
                <div className="text-white/20">
                  <User size={80} />
                </div>
              )}

              <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
                <div className="w-24 h-24 rounded-full border-4 border-white bg-white shadow-lg overflow-hidden flex items-center justify-center text-primary-600 text-3xl font-black">
                  {selectedUser.photoUrl ? (
                    <img src={selectedUser.photoUrl} alt={selectedUser.name} className="w-full h-full object-cover" />
                  ) : (
                    selectedUser.name.charAt(0)
                  )}
                </div>
              </div>
            </div>

            <div className="pt-16 pb-8 px-8 text-center">
              <h2 className="text-2xl font-black text-gray-900">{selectedUser.name}</h2>
              <p className="text-primary-600 font-bold text-sm mb-6">Cliente do Mercado</p>

              <div className="space-y-4 text-left">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Phone size={10} /> Contato
                  </p>
                  <p className="text-gray-700 font-bold">
                    {selectedUser.phone ? formatPhone(selectedUser.phone) : 'Não informado'}
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                    <MapPin size={10} /> Endereço de Entrega
                  </p>
                  <p className="text-gray-700 font-bold leading-tight">
                    {selectedUser.address || 'Endereço não cadastrado'}
                  </p>
                  {selectedUser.neighborhood && (
                    <p className="text-primary-600 text-sm font-bold mt-1">
                      Bairro: {selectedUser.neighborhood.name}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 text-center">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Desde</p>
                    <p className="text-gray-700 font-bold text-xs">{formatDate(selectedUser.createdAt).split(',')[0]}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 text-center">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Último Login</p>
                    <p className="text-gray-700 font-bold text-xs">
                      {selectedUser.lastLogin ? formatLastLogin(selectedUser.lastLogin).split(',')[0] : 'Nunca'}
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedUser(null)}
                className="w-full mt-8 py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-all active:scale-95"
              >
                Fechar Detalhes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ ...deleteModal, open: false })}
        onConfirm={handleDeleteUser}
        title="Excluir Cliente?"
        message={`Tem certeza que deseja excluir o cliente "${deleteModal.userName}"? Esta ação não pode ser desfeita.`}
        confirmText="Sim, Excluir"
        cancelText="Cancelar"
        type="danger"
        isLoading={deleting}
      />
    </div>
  )
}
