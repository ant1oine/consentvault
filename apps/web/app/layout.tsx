import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { Sidebar } from '@/components/layout/sidebar'
import { TopBar } from '@/components/layout/topbar'
import { LockScreenWrapper } from '@/components/layout/lock-screen-wrapper'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'ConsentVault Admin Dashboard',
  description: 'Admin dashboard for ConsentVault consent management',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.variable}>
        <Providers>
          <LockScreenWrapper>
            <div className="flex h-screen overflow-hidden">
              <Sidebar />
              <div className="flex flex-1 flex-col overflow-hidden">
                <TopBar />
                <main className="flex-1 overflow-y-auto bg-gradient-to-br from-background to-muted/20 p-6">
                  {children}
                </main>
              </div>
            </div>
          </LockScreenWrapper>
        </Providers>
      </body>
    </html>
  )
}

