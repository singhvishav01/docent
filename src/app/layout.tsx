import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import { ClientProviders } from '@/components/providers/ClientProviders'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'DOCENT',
  description: 'Your AI museum guide',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', type: 'image/jpeg' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'DOCENT',
  },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0D0A07',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Cinzel:wght@400;600;700&family=Raleway:wght@200;300;400&display=swap" rel="stylesheet" />
      </head>
      <body className={inter.className}>
        <div className="min-h-screen" style={{ background: '#0D0A07' }}>
          <ClientProviders>
            <main>{children}</main>
            <Toaster
              position="top-center"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#0D0A07',
                  color: '#F2E8D5',
                  border: '1px solid rgba(201,168,76,0.25)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                  fontFamily: "'Cinzel', serif",
                  fontSize: '10px',
                  letterSpacing: '0.2em',
                  borderRadius: '0',
                  padding: '12px 20px',
                },
                success: {
                  iconTheme: { primary: '#C9A84C', secondary: '#0D0A07' },
                },
                error: {
                  iconTheme: { primary: '#A67B6B', secondary: '#0D0A07' },
                  style: {
                    background: '#0D0A07',
                    color: '#F2E8D5',
                    border: '1px solid rgba(166,123,107,0.3)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                    fontFamily: "'Cinzel', serif",
                    fontSize: '10px',
                    letterSpacing: '0.2em',
                    borderRadius: '0',
                    padding: '12px 20px',
                  },
                },
              }}
            />
          </ClientProviders>
        </div>
      </body>
    </html>
  )
}
