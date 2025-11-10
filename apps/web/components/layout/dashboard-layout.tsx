'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { LockScreenWrapper } from '@/components/layout/lock-screen-wrapper'

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  // Don't wrap login page with dashboard layout
  if (pathname === '/login') {
    return <>{children}</>
  }

  // Wrap protected routes with LockScreenWrapper and dashboard UI
  return (
    <LockScreenWrapper>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <a href="/dashboard" className="text-sm text-gray-600 hover:text-black transition-colors">
                API Dashboard
              </a>
            </div>
          </div>
          <main className="flex-1 overflow-y-auto bg-gradient-to-br from-background to-muted/20 p-6">
            {children}
          </main>
        </div>
      </div>
    </LockScreenWrapper>
  )
}

