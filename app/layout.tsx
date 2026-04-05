import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { Providers } from './providers'
import FloatingCart from '@/components/FloatingCart'
import InstallPWAButton from '@/components/InstallPWAButton'
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'NüBox - Seu Mercado autônomo 24h',
  description: 'Consulte produtos disponíveis no NüBox do condomínio',
  icons: {
    icon: '/nubox-app-192.png',
    apple: '/nubox-app-192.png',
  },
  manifest: '/manifest.json',
  themeColor: '#16a34a',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'NüBox - Seu Mercado autônomo 24h',
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
          <InstallPWAButton />
          <ServiceWorkerRegistration />
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

