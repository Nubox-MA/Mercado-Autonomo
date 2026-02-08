import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { Providers } from './providers'
import FloatingCart from '@/components/FloatingCart'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'NüBox - Catálogo Digital',
  description: 'Consulte produtos disponíveis no NüBox do condomínio',
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <Providers>
          {children}
          <FloatingCart />
          <Toaster 
            position="top-right"
            containerStyle={{
              top: '80px', // Abaixo do navbar (64px + 16px de margem)
            }}
            toastOptions={{
              duration: 3000, // 3 segundos
              style: {
                background: '#fff',
                color: '#363636',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  )
}

