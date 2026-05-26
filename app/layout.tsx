import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { ThemeProvider } from '@/components/theme-provider'
import PwaProvider from '@/components/pwa-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'MaternalCare Plus - Digital Antenatal Care',
  description: 'Digital platform for managing antenatal care',
  applicationName: 'MaternalCare Plus',
  appleWebApp: {
    capable: true,
    title: 'MaternalCare+',
    statusBarStyle: 'default',
  },
  formatDetection: {
    telephone: false,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ClerkProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <PwaProvider />
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  )
}
