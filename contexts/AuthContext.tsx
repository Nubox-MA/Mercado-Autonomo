import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'

interface User {
  id: string
  name: string
  cpf?: string
  phone?: string | null
  role: string
  address?: string | null
  neighborhoodId?: string | null
  photoUrl?: string | null
}

interface LoginCredentials {
  cpf?: string
  password?: string
  name?: string
  phone?: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
  isLoading: boolean
  isAdmin: boolean
  updateUser: (user: User) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('mercado-token')
      const savedUser = localStorage.getItem('mercado-user')

      if (savedToken && savedUser) {
        setToken(savedToken)
        setUser(JSON.parse(savedUser))
        
        try {
          // Atualizar dados do usuário do servidor para garantir que está tudo fresco
          const response = await axios.get('/api/auth/me', {
            headers: { Authorization: `Bearer ${savedToken}` }
          })
          if (response.data?.user) {
            setUser(response.data.user)
            localStorage.setItem('mercado-user', JSON.stringify(response.data.user))
          }
        } catch (error) {
          console.error('Erro ao validar sessão:', error)
          // Se o token expirou ou é inválido, limpa a sessão
          if (axios.isAxiosError(error) && error.response?.status === 401) {
            logout()
          }
        }
      }
      setIsLoading(false)
    }

    initAuth()
  }, [])

  const login = async (credentials: LoginCredentials) => {
    try {
      const response = await axios.post('/api/auth/login', credentials)
      const { token: newToken, user: newUser } = response.data
      
      setToken(newToken)
      setUser(newUser)
      
      localStorage.setItem('mercado-token', newToken)
      localStorage.setItem('mercado-user', JSON.stringify(newUser))
      
      toast.success('Login realizado com sucesso!')
    } catch (error: any) {
      console.error('Login error:', error.response?.data)
      toast.error(error.response?.data?.error || 'Erro ao fazer login')
      throw error
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('mercado-token')
    localStorage.removeItem('mercado-user')
    toast.success('Logout realizado com sucesso!')
  }

  const isAdmin = user?.role === 'ADMIN'
  const updateUser = (newUser: User) => {
    setUser(newUser)
    localStorage.setItem('mercado-user', JSON.stringify(newUser))
  }

  return (
    <AuthContext.Provider
      value={{ user, token, login, logout, isLoading, isAdmin, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
