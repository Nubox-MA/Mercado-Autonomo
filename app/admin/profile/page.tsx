'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import axios from 'axios'
import { User, Lock, Save, MessageCircle, Eye, EyeOff, UserPlus, Plus, Trash2, Edit, XCircle } from 'lucide-react'
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
  
  // Configurações do botão de cadastro facial (nova estrutura)
  interface FacialConfig {
    neighborhoodId: string
    url: string
    enabled: boolean
  }
  const [facialConfigs, setFacialConfigs] = useState<FacialConfig[]>([])
  const [neighborhoods, setNeighborhoods] = useState<Array<{ id: string; name: string }>>([])
  const [showNewConfigModal, setShowNewConfigModal] = useState(false)
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null)
  const [newConfig, setNewConfig] = useState({ neighborhoodId: '', url: '', enabled: true })
  const [facialSettingsLoading, setFacialSettingsLoading] = useState(false)
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
      
      // Carregar configurações do botão de cadastro facial (nova estrutura)
      const facialConfigsJson = response.data.facialRegistrationConfigs || '[]'
      try {
        const configs = JSON.parse(facialConfigsJson)
        setFacialConfigs(Array.isArray(configs) ? configs : [])
      } catch (e) {
        setFacialConfigs([])
      }
      
      // Buscar lista de locais
      const neighborhoodsResponse = await axios.get('/api/admin/neighborhoods', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setNeighborhoods(neighborhoodsResponse.data || [])
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

  const handleSaveNewConfig = async () => {
    if (!newConfig.neighborhoodId || !newConfig.url) {
      toast.error('Selecione um local e informe o link')
      return
    }

    // Se estiver editando
    if (editingConfigId) {
      // Se mudou o local, verificar se o novo local já tem configuração
      if (newConfig.neighborhoodId !== editingConfigId) {
        if (facialConfigs.some(c => c.neighborhoodId === newConfig.neighborhoodId)) {
          toast.error('Já existe uma configuração para este local')
          return
        }
      }

      // Remover a configuração antiga e adicionar a nova (pode ter mudado o local)
      const updatedConfigs = facialConfigs
        .filter(config => config.neighborhoodId !== editingConfigId)
        .concat([newConfig])
      
      setFacialSettingsLoading(true)
      try {
        await axios.post(
          '/api/admin/settings',
          { key: 'facialRegistrationConfigs', value: JSON.stringify(updatedConfigs) },
          { headers: { Authorization: `Bearer ${token}` } }
        )
        setFacialConfigs(updatedConfigs)
        setNewConfig({ neighborhoodId: '', url: '', enabled: true })
        setEditingConfigId(null)
        setShowNewConfigModal(false)
        toast.success('Configuração atualizada com sucesso!')
      } catch (error) {
        toast.error('Erro ao atualizar configuração')
      } finally {
        setFacialSettingsLoading(false)
      }
      return
    }

    // Se for nova configuração, verificar se já existe
    if (facialConfigs.some(c => c.neighborhoodId === newConfig.neighborhoodId)) {
      toast.error('Já existe uma configuração para este local')
      return
    }

    setFacialSettingsLoading(true)
    try {
      const updatedConfigs = [...facialConfigs, newConfig]
      await axios.post(
        '/api/admin/settings',
        { key: 'facialRegistrationConfigs', value: JSON.stringify(updatedConfigs) },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setFacialConfigs(updatedConfigs)
      setNewConfig({ neighborhoodId: '', url: '', enabled: true })
      setShowNewConfigModal(false)
      toast.success('Configuração criada com sucesso!')
    } catch (error) {
      toast.error('Erro ao salvar configuração')
    } finally {
      setFacialSettingsLoading(false)
    }
  }

  const handleEditConfig = (neighborhoodId: string) => {
    const config = facialConfigs.find(c => c.neighborhoodId === neighborhoodId)
    if (config) {
      setNewConfig({ ...config })
      setEditingConfigId(neighborhoodId)
      setShowNewConfigModal(true)
    }
  }

  const handleToggleConfig = async (neighborhoodId: string) => {
    const updatedConfigs = facialConfigs.map(config =>
      config.neighborhoodId === neighborhoodId
        ? { ...config, enabled: !config.enabled }
        : config
    )
    
    setFacialSettingsLoading(true)
    try {
      await axios.post(
        '/api/admin/settings',
        { key: 'facialRegistrationConfigs', value: JSON.stringify(updatedConfigs) },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setFacialConfigs(updatedConfigs)
      toast.success('Configuração atualizada!')
    } catch (error) {
      toast.error('Erro ao atualizar configuração')
    } finally {
      setFacialSettingsLoading(false)
    }
  }

  const handleDeleteConfig = async (neighborhoodId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta configuração?')) {
      return
    }

    const updatedConfigs = facialConfigs.filter(c => c.neighborhoodId !== neighborhoodId)
    setFacialSettingsLoading(true)
    try {
      await axios.post(
        '/api/admin/settings',
        { key: 'facialRegistrationConfigs', value: JSON.stringify(updatedConfigs) },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setFacialConfigs(updatedConfigs)
      toast.success('Configuração excluída!')
    } catch (error) {
      toast.error('Erro ao excluir configuração')
    } finally {
      setFacialSettingsLoading(false)
    }
  }

  const getNeighborhoodName = (neighborhoodId: string) => {
    return neighborhoods.find(n => n.id === neighborhoodId)?.name || 'Local não encontrado'
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

        {/* Configurações do Botão de Cadastro Facial */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <UserPlus size={24} className="text-primary-600" />
              <h2 className="text-xl font-bold">Cadastro Facial</h2>
            </div>
            <button
              onClick={() => setShowNewConfigModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={20} />
              Novo Botão
            </button>
          </div>

          {/* Cards de Configurações Existentes */}
          <div className="space-y-4 mb-6">
            {facialConfigs.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed">
                <UserPlus size={48} className="text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Nenhuma configuração cadastrada</p>
                <p className="text-sm text-gray-400 mt-1">Clique em &quot;Novo Botão&quot; para criar</p>
              </div>
            ) : (
              facialConfigs.map((config) => {
                const neighborhood = neighborhoods.find(n => n.id === config.neighborhoodId)
                return (
                  <div
                    key={config.neighborhoodId}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      config.enabled
                        ? 'border-primary-200 bg-primary-50'
                        : 'border-gray-200 bg-gray-50 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-lg">{neighborhood?.name || 'Local não encontrado'}</h3>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-bold ${
                              config.enabled
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-200 text-gray-600'
                            }`}
                          >
                            {config.enabled ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 break-all">{config.url}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditConfig(config.neighborhoodId)}
                          disabled={facialSettingsLoading}
                          className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                          title="Editar"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleToggleConfig(config.neighborhoodId)}
                          disabled={facialSettingsLoading}
                          className={`p-2 rounded-lg transition-colors ${
                            config.enabled
                              ? 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                          title={config.enabled ? 'Desativar' : 'Ativar'}
                        >
                          {config.enabled ? (
                            <XCircle size={18} />
                          ) : (
                            <Eye size={18} />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteConfig(config.neighborhoodId)}
                          disabled={facialSettingsLoading}
                          className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Modal para Criar/Editar Configuração */}
          {showNewConfigModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl p-6">
                <h3 className="text-xl font-bold mb-4">
                  {editingConfigId ? 'Editar Botão de Cadastro Facial' : 'Novo Botão de Cadastro Facial'}
                </h3>
                
                <div className="space-y-4">
                  {/* Seleção de Local */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Selecione o Local *
                    </label>
                    <select
                      value={newConfig.neighborhoodId}
                      onChange={(e) => setNewConfig({ ...newConfig, neighborhoodId: e.target.value })}
                      className="input-field w-full"
                    >
                      <option value="">Selecione um local</option>
                      {neighborhoods
                        .filter(n => {
                          // Ao editar, mostrar todos os locais (incluindo o atual)
                          if (editingConfigId) {
                            return true
                          }
                          // Ao criar novo, mostrar apenas locais sem configuração
                          return !facialConfigs.some(c => c.neighborhoodId === n.id)
                        })
                        .map((neighborhood) => (
                          <option key={neighborhood.id} value={neighborhood.id}>
                            {neighborhood.name}
                          </option>
                        ))}
                    </select>
                    {!editingConfigId && facialConfigs.length > 0 && neighborhoods.filter(n => !facialConfigs.some(c => c.neighborhoodId === n.id)).length === 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Todos os locais já possuem configuração
                      </p>
                    )}
                  </div>

                  {/* Link */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Link para Cadastro Facial *
                    </label>
                    <input
                      type="url"
                      value={newConfig.url}
                      onChange={(e) => setNewConfig({ ...newConfig, url: e.target.value })}
                      placeholder="https://exemplo.com/cadastro-facial"
                      className="input-field w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      * Link fornecido pelo desenvolvedor da fechadura eletrônica
                    </p>
                  </div>

                  {/* Habilitar */}
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setNewConfig({ ...newConfig, enabled: !newConfig.enabled })}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        newConfig.enabled ? 'bg-primary-600' : 'bg-gray-300'
                      }`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                        newConfig.enabled ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </button>
                    <label className="text-sm font-medium cursor-pointer" onClick={() => setNewConfig({ ...newConfig, enabled: !newConfig.enabled })}>
                      Botão visível
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleSaveNewConfig}
                    disabled={facialSettingsLoading || !newConfig.neighborhoodId || !newConfig.url}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    <Save size={20} />
                    {facialSettingsLoading ? 'Salvando...' : editingConfigId ? 'Atualizar' : 'Salvar'}
                  </button>
                  <button
                    onClick={() => {
                      setShowNewConfigModal(false)
                      setNewConfig({ neighborhoodId: '', url: '', enabled: true })
                      setEditingConfigId(null)
                    }}
                    className="px-4 py-2 border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

