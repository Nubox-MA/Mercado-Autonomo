'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LayoutDashboard, Package, FolderTree, LogOut, Home, User, Menu, X, MapPin, FileSpreadsheet } from 'lucide-react'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isAdmin, logout, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Sempre chamar hooks na mesma ordem (regra dos hooks do React)
  useEffect(() => {
    // Não aplicar verificações na página de login
    if (pathname === '/admin/login') {
      return
    }

    if (isLoading) return

    if (!user) {
      router.push('/admin/login')
    } else if (!isAdmin) {
      router.push('/')
    }
  }, [user, isAdmin, isLoading, router, pathname])

  // Não aplicar layout na página de login - verificar depois de chamar todos os hooks
  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  if (isLoading || !user || !isAdmin) {
    return null
  }

  const navItems = [
    { href: '/admin', icon: LayoutDashboard, label: 'Painel de Controle' },
    { href: '/admin/products', icon: Package, label: 'Produtos' },
    { href: '/admin/import', icon: FileSpreadsheet, label: 'Importar Excel' },
    { href: '/admin/categories', icon: FolderTree, label: 'Categorias' },
    { href: '/admin/neighborhoods', icon: MapPin, label: 'Condomínios' },
    { href: '/admin/profile', icon: User, label: 'Meu Perfil' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Bar */}
      <div 
        className="bg-primary-600 text-white shadow-lg sticky top-0 z-50"
        style={{ paddingTop: 'var(--sat, 0px)' }}
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden p-2 hover:bg-primary-700 rounded-lg transition"
              >
                {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              <h1 className="text-xl font-bold truncate">Painel Administrativo</h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <Link
                href="/"
                className="hover:bg-primary-700 p-2 rounded-lg transition flex items-center gap-2"
              >
                <Home size={20} />
                <span className="hidden sm:inline">Catálogo</span>
              </Link>
              <button
                onClick={logout}
                className="hover:bg-primary-700 p-2 rounded-lg transition flex items-center gap-2"
              >
                <LogOut size={20} />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 flex-1 flex flex-col lg:flex-row gap-6 relative">
        {/* Sidebar / Mobile Drawer */}
        <aside 
          className={`
            fixed lg:sticky left-0 w-64
            bg-white lg:bg-transparent shadow-2xl lg:shadow-none z-40 lg:z-0
            transition-transform duration-300 transform
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            p-4 lg:p-0
          `}
          style={{ 
            top: 'calc(64px + var(--sat, 0px))', 
            height: 'calc(100vh - 64px - var(--sat, 0px))' 
          }}
        >
          <nav className="bg-white rounded-2xl shadow-md p-2 lg:sticky lg:top-6">
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setIsSidebarOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary-50 hover:text-primary-600 transition-all font-medium text-gray-600"
                  >
                    <item.icon size={20} />
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Overlay for mobile sidebar */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  )
}

