import type { Metadata } from 'next'
import AuthProvider from '@/components/providers/AuthProvider'
import './globals.css'

export const metadata: Metadata = {
  title: 'Saskia Saúde - Sistema Integrado de Gestão Hospitalar',
  description: 'Sistema completo de gestão hospitalar. Gerencie pacientes, agenda, receituários, farmácia, exames e muito mais.',
  icons: { icon: '/images/logo.png' }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href="/line-awesome/css/line-awesome.min.css" />
      </head>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
