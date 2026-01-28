'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import axios from 'axios'
import { User, Lock, Save, MessageCircle, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

interface ProfileData {
  id: string
  name: string
  cpf: string
  role: string
}

export default function ProfilePage() {
  const { user, token } = useAuth()
  const [loading, setLoading] = useState(false)
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [whatsapp, setWhatsapp] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    cpf: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        cpf: user.cpf || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
    }
    fetchSettings()
  }, [user])

  const fetchSettings = async () => {
    try {
      const response = await axios.get('/api/admin/settings')
      if (response.data.whatsapp) {
        // Remover o +55 inicial se existir para exibir apenas o restante no input com máscara
        const raw = response.data.whatsapp.replace('55', '')
        setWhatsapp(formatPhoneNumber(raw))
      }
    } catch (error) {
      console.error('Erro ao buscar configurações:', error)
    }
  }

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 2) return numbers
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`
  }

  const handleUpdateWhatsapp = async (e: React.FormEvent) => {
    e.preventDefault()
    setSettingsLoading(true)
    try {
      // Salva apenas os números, incluindo o 55 fixo
      const cleanNumber = '55' + whatsapp.replace(/\D/g, '')
      await axios.post(
        '/api/admin/settings',
        { key: 'whatsapp', value: cleanNumber },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success('Número do WhatsApp atualizado!')
    } catch (error) {
      toast.error('Erro ao atualizar WhatsApp')
    } finally {
      setSettingsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validar senhas se for alterar
      if (formData.newPassword) {
        if (formData.newPassword !== formData.confirmPassword) {
          toast.error('Nova senha e confirmação não coincidem')
          return
        }
        if (formData.newPassword.length < 6) {
          toast.error('Nova senha deve ter pelo menos 6 caracteres')
          return
        }
      }

      await axios.put(
        '/api/admin/profile',
        {
          name: formData.name,
          cpf: formData.cpf || 'admin', // Garantir que o CPF seja enviado, mesmo que o user state demore a atualizar
          currentPassword: formData.currentPassword || undefined,
          newPassword: formData.newPassword || undefined,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      toast.success('Perfil atualizado com sucesso!')
      
      // Limpar campos de senha
      setFormData({
        ...formData,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
    } catch (error: any) {
      console.error('Erro ao atualizar perfil:', error)
      toast.error(error.response?.data?.error || 'Erro ao atualizar perfil')
    } finally {
      setLoading(false)
    }
  }

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    }
    return value
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Meu Perfil</h1>
        <p className="text-gray-600 mt-1">
          Atualize suas informações pessoais e senha
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Informações Pessoais */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <User size={24} className="text-primary-600" />
            <h2 className="text-xl font-bold">Informações Pessoais</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Nome do Administrador
                <span className="text-xs text-gray-500 ml-2 font-normal">
                  (Exibido no menu superior)
                </span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-field"
                placeholder="Ex: Administrador"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Este nome será exibido no canto superior direito do painel administrativo
              </p>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center gap-3 mb-4">
                <Lock size={20} className="text-gray-600" />
                <h3 className="font-semibold">Alterar Senha</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Senha Atual
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      value={formData.currentPassword}
                      onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                      className="input-field pr-12"
                      placeholder="Digite sua senha atual"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Nova Senha
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={formData.newPassword}
                      onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                      className="input-field pr-12"
                      placeholder="Digite a nova senha"
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Confirmar Nova Senha
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="input-field pr-12"
                      placeholder="Confirme a nova senha"
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex items-center gap-2"
              >
                <Save size={20} />
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        </div>

        {/* Informações do Sistema */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Informações do Sistema</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-gray-600">Versão do Aplicativo:</span>
              <span className="font-bold text-primary-600">2.0.0</span>
            </div>
            
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-gray-600">Função:</span>
              <span className="font-medium">Administrador</span>
            </div>
            
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-gray-600">Acesso:</span>
              <span className="font-medium">Painel Administrativo</span>
            </div>
            
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-gray-600">Permissões:</span>
              <span className="font-medium">Completo</span>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">
              ℹ️ Sobre a alteração de senha:
            </h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Deixe os campos de senha vazios para não alterar</li>
              <li>• Nova senha deve ter pelo menos 6 caracteres</li>
            </ul>
          </div>
        </div>

        {/* Configurações do Sistema */}
        <div className="card lg:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <MessageCircle size={24} className="text-green-600" />
            <h2 className="text-xl font-bold">Atendimento ao Cliente</h2>
          </div>

          <form onSubmit={handleUpdateWhatsapp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Número do WhatsApp para Suporte
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">
                    +55
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(formatPhoneNumber(e.target.value))}
                    placeholder="(00) 00000-0000"
                    className="input-field pl-12 font-medium"
                    maxLength={15}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={settingsLoading}
                  className="btn-primary bg-green-600 hover:bg-green-700 border-green-600 flex items-center gap-2 justify-center"
                >
                  <Save size={20} />
                  {settingsLoading ? 'Salvando...' : 'Atualizar WhatsApp'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2 italic">
                * O prefixo +55 já está incluso. Digite apenas o DDD e o número. Exemplo: (11) 98888-7777
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

