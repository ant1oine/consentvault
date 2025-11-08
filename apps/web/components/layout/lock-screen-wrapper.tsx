'use client'

import { useState, useEffect } from 'react'
import { LockScreen } from './topbar'

export function LockScreenWrapper({ children }: { children: React.ReactNode }) {
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('consentvault_api_key')
      setHasApiKey(!!stored)
    }
  }, [])

  if (hasApiKey === null) {
    // Still checking
    return null
  }

  if (!hasApiKey) {
    return <LockScreen />
  }

  return <>{children}</>
}

