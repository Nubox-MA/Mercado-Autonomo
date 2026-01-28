'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useCart } from '@/contexts/CartContext'
import { useCondominium } from '@/contexts/CondominiumContext'
import { ShoppingCart, User, LogOut, Settings, Heart, History, MapPin, Lock } from 'lucide-react'
import ProfileModal from '@/components/ProfileModal'
import ConfirmModal from '@/components/ConfirmModal'
import Image from 'next/image'

export default function Navbar() {
  const { user, logout, isAdmin, isLoading } = useAuth()
  const { itemCount, clearCart } = useCart()
  const { selectedCondominium, setSelectedCondominium } = useCondominium()
  const router = useRouter()
  const pathname = usePathname()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [showChangeCondominiumModal, setShowChangeCondominiumModal] = useState(false)

  // Abrir modal automaticamente se o perfil estiver incompleto após o login (apenas para admin)
  useEffect(() => {
    if (!isLoading && user && user.role === 'ADMIN') {
      const isProfileIncomplete = !user.photoUrl
      
      // Usamos sessionStorage para garantir que só abra uma vez por sessão
      // para não ser irritante se o usuário fechar o modal propositalmente
      const hasShownAuto = sessionStorage.getItem(`profile-popup-${user.id}`)

      if (isProfileIncomplete && !hasShownAuto) {
        setIsProfileOpen(true)
        sessionStorage.setItem(`profile-popup-${user.id}`, 'true')
      }
    }
  }, [user, isLoading])

  return (
    <>
      <nav 
        className="bg-primary-600 text-white shadow-lg sticky top-0 z-40"
        style={{ paddingTop: 'var(--sat, 0px)' }}
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="text-lg sm:text-xl font-black tracking-tighter sm:tracking-tight flex-shrink-0">
              Mercado<span className="text-primary-200">Autônomo</span>
            </Link>

            <div className="flex items-center gap-0.5 sm:gap-2 ml-auto">
              {/* Carrinho sempre visível - PRIMEIRO */}
              <Link
                href="/cart"
                className="relative hover:bg-primary-700 p-2 rounded-lg transition"
                title="Minha Lista"
              >
                <ShoppingCart size={22} />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </Link>

              {/* Botão para trocar condomínio - SEGUNDO - só mostrar se não estiver na página de seleção */}
              {selectedCondominium && pathname !== '/select-condominium' && (
                <button
                  onClick={() => setShowChangeCondominiumModal(true)}
                  className="hover:bg-primary-700 p-2 rounded-lg transition flex items-center gap-2"
                  title="Trocar Condomínio"
                >
                  {selectedCondominium.photoUrl ? (
                    <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border-2 border-white/30">
                      <Image
                        src={selectedCondominium.photoUrl}
                        alt={selectedCondominium.name}
                        fill
                        sizes="32px"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <MapPin size={20} />
                  )}
                  <span className="text-xs font-medium hidden sm:inline max-w-[100px] truncate">
                    {selectedCondominium.name}
                  </span>
                </button>
              )}

              {/* Se estiver logado como admin */}
              {user && isAdmin && (
                <>
                  <Link
                    href="/admin"
                    className="hover:bg-primary-700 p-2 rounded-lg transition"
                    title="Painel Admin"
                  >
                    <Settings size={22} />
                  </Link>

                  <div className="h-6 w-[1px] bg-primary-500 mx-1 hidden sm:block" />

                  <button
                    type="button"
                    onClick={() => setIsProfileOpen(true)}
                    className="flex items-center gap-2 pl-1 rounded-full hover:bg-primary-700 transition px-2 py-1"
                  >
                    <div className="bg-primary-700 overflow-hidden rounded-full w-8 h-8 flex items-center justify-center">
                      {user.photoUrl ? (
                        <img
                          src={user.photoUrl}
                          alt={user.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User size={16} />
                      )}
                    </div>
                    <span className="text-xs font-bold hidden md:block max-w-[100px] truncate">
                      {user.name}
                    </span>
                  </button>

                  <button
                    onClick={logout}
                    className="bg-red-500 hover:bg-red-600 p-1.5 sm:p-2 rounded-lg transition text-white shadow-md active:scale-95"
                    title="Sair"
                  >
                    <LogOut size={18} className="sm:w-5 sm:h-5" />
                  </button>
                </>
              )}

              {/* Se não estiver logado, mostrar link discreto para admin - TERCEIRO */}
              {!user && (
                <Link
                  href="/admin/login"
                  className="hover:bg-primary-700 p-2 rounded-lg transition"
                  title="Acesso Admin"
                >
                  <Lock size={22} />
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>
      <ProfileModal open={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      
      <ConfirmModal
        isOpen={showChangeCondominiumModal}
        onClose={() => setShowChangeCondominiumModal(false)}
        onConfirm={() => {
          clearCart()
          setSelectedCondominium(null) // Limpar condomínio selecionado
          setShowChangeCondominiumModal(false)
          router.push('/select-condominium')
        }}
        title="Trocar Condomínio?"
        message={selectedCondominium ? `Você selecionou o "${selectedCondominium.name}". Tem certeza que deseja trocar de condomínio?` : 'Tem certeza que deseja trocar de condomínio?'}
        confirmText="Sim, Trocar"
        cancelText="Cancelar"
        type="warning"
      />
    </>
  )
}

