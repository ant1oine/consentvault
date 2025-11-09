'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthContext'

export function LockScreenWrapper({ children }: { children: React.ReactNode }) {
  const { apiKey } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Don't redirect if already on login page
    if (pathname === '/login') {
      return
    }

    // Redirect to login if no API key
    if (!apiKey) {
      router.push('/login')
    }
  }, [apiKey, router, pathname])

  // Don't render children if on login page or no API key
  if (pathname === '/login' || !apiKey) {
    return null
  }

  return <>{children}</>
}

