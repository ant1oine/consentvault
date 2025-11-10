'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface Org {
  id: number
  name: string
}

interface AuthContextType {
  apiKey: string | null
  org: Org | null
  role: string | null
  isSuperAdmin: boolean
  setApiKey: (key: string | null) => void
  setOrg: (org: Org | null) => void
  logout: () => void
  hasPermission: (requiredRole: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKeyState] = useState<string | null>(null)
  const [org, setOrgState] = useState<Org | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    const storedKey = localStorage.getItem('cv_api_key')
    const storedOrg = localStorage.getItem('cv_org')
    const storedRole = localStorage.getItem('cv_role')
    const storedSuperAdmin = localStorage.getItem('cv_is_superadmin')

    if (storedKey) {
      setApiKeyState(storedKey)
    }
    if (storedOrg) {
      try {
        setOrgState(JSON.parse(storedOrg))
      } catch {
        // Ignore parse errors
      }
    }
    if (storedRole) {
      setRole(storedRole)
    }
    if (storedSuperAdmin === 'true') {
      setIsSuperAdmin(true)
    }
  }, [])

  const setApiKey = (key: string | null) => {
    setApiKeyState(key)
    if (key) {
      localStorage.setItem('cv_api_key', key)
    } else {
      localStorage.removeItem('cv_api_key')
    }
  }

  const setOrg = (newOrg: Org | null) => {
    setOrgState(newOrg)
    if (newOrg) {
      localStorage.setItem('cv_org', JSON.stringify(newOrg))
    } else {
      localStorage.removeItem('cv_org')
    }
  }

  const logout = () => {
    setApiKeyState(null)
    setOrgState(null)
    setRole(null)
    setIsSuperAdmin(false)
    localStorage.removeItem('cv_api_key')
    localStorage.removeItem('cv_org')
    localStorage.removeItem('cv_role')
    localStorage.removeItem('cv_is_superadmin')
  }

  const hasPermission = (requiredRole: string): boolean => {
    if (isSuperAdmin) return true
    if (!role) return false
    
    const roleHierarchy: Record<string, number> = {
      VIEWER: 1,
      AUDITOR: 2,
      ADMIN: 3,
      SUPERADMIN: 4,
    }
    
    const userLevel = roleHierarchy[role.toUpperCase()] || 0
    const requiredLevel = roleHierarchy[requiredRole.toUpperCase()] || 0
    
    return userLevel >= requiredLevel
  }

  return (
    <AuthContext.Provider
      value={{
        apiKey,
        org,
        role,
        isSuperAdmin,
        setApiKey,
        setOrg,
        logout,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
