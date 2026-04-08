import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  Show,
  UserButton,
} from '@clerk/nextjs'
import { ThemeProvider } from '@/components/theme-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'MaternalCare Plus - Digital Antenatal Care',
  description: 'Digital platform for managing antenatal care',
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
            <header className="flex justify-between items-center p-4 border-b">
              <div className="font-bold text-xl text-primary">MaternalCare Plus</div>
              <div className="flex gap-4 items-center">
                <Show when="signed-out">
                  <SignInButton />
                  <SignUpButton />
                </Show>
                <Show when="signed-in">
                  <UserButton />
                </Show>
              </div>
            </header>
            {children}
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  )
}
