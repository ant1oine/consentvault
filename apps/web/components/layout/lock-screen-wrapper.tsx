'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export function LockScreenWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    // Only run on client after hydration
    if (!isClient) return

    // Don't redirect if already on login page
    if (pathname === '/login') {
      return
    }

    // Check for access_token in localStorage (client-side only)
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null

    // Redirect to login if no token
    if (!token) {
      router.replace('/login')
    }
  }, [isClient, router, pathname])

  // Don't render children if on login page
  if (pathname === '/login') {
    return null
  }

  // Don't render until client-side hydration is complete
  if (!isClient) {
    return null
  }

  // Check token on client-side
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
  if (!token) {
    return null
  }

  return <>{children}</>
}

