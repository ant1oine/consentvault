'use client'

import { useEffect, useState } from 'react'
import { checkBackendConnection, API_URL } from '@/lib/api'

export default function BackendStatusBanner() {
  const [reachable, setReachable] = useState(true)

  useEffect(() => {
    async function verify() {
      const ok = await checkBackendConnection()
      setReachable(ok)
    }
    verify()

    // Re-check every 10 seconds
    const interval = setInterval(verify, 10000)
    return () => clearInterval(interval)
  }, [])

  if (reachable) return null

  return (
    <div className="fixed top-0 left-0 right-0 bg-red-600 text-white text-center py-2 z-50">
      ⚠️ Backend unreachable at {API_URL}. Check Docker or .env.local configuration.
    </div>
  )
}

