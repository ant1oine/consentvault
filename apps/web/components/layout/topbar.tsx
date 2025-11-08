'use client'

import { useState, useEffect, useRef } from 'react'
import { Settings, Lock, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getOrganizations,
  Organization,
  getConsents,
  getRights,
  getPurposes,
  getUsers,
  getPolicies,
  getWebhooks,
  getAuditLogs,
} from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'

const STORAGE_KEY = 'consentvault_api_key'
const ORG_KEY = 'selectedOrgId'

export function TopBar() {
  const [apiKey, setApiKey] = useState<string>('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [hasApiKey, setHasApiKey] = useState(false)
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null)
  const queryClient = useQueryClient()
  const lastPrefetchedOrg = useRef<number | null>(null)

  const { data: organizations } = useQuery({
    queryKey: queryKeys.organizations(),
    queryFn: () => getOrganizations(),
    enabled: hasApiKey,
    retry: false,
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem(STORAGE_KEY)
    setHasApiKey(!!stored)
    if (stored) {
      setApiKey(stored)
    }
    const storedOrg = localStorage.getItem(ORG_KEY)
    if (storedOrg) {
      setSelectedOrgId(parseInt(storedOrg, 10))
    }
  }, [])

  useEffect(() => {
    if (organizations && organizations.length > 0 && !selectedOrgId) {
      const firstOrgId = organizations[0].id
      setSelectedOrgId(firstOrgId)
      if (typeof window !== 'undefined') {
        localStorage.setItem(ORG_KEY, firstOrgId.toString())
      }
    }
  }, [organizations, selectedOrgId])

  const invalidateOrgScopedQueries = () => {
    const scopedKeys = [
      queryKeys.consents({ limit: 100 }),
      queryKeys.consents({ limit: 1000 }),
      queryKeys.rights(),
      queryKeys.users(),
      queryKeys.purposes(),
      queryKeys.policies(),
      queryKeys.webhooks(),
      queryKeys.auditLogs(),
    ]
    scopedKeys.forEach((key) =>
      queryClient.invalidateQueries({ queryKey: key })
    )
  }

  const handleOrgChange = (orgId: number) => {
    setSelectedOrgId(orgId)
    if (typeof window !== 'undefined') {
      localStorage.setItem(ORG_KEY, orgId.toString())
    }
    invalidateOrgScopedQueries()
    toast.success('Organization switched')
  }

  const handleSaveApiKey = () => {
    if (!apiKey.trim()) {
      toast.error('Please enter an API key')
      return
    }
    localStorage.setItem(STORAGE_KEY, apiKey)
    setHasApiKey(true)
    setSettingsOpen(false)
    toast.success('API key saved successfully')
    queryClient.clear()
    window.location.reload()
  }

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(ORG_KEY)
    setApiKey('')
    setHasApiKey(false)
    setSettingsOpen(false)
    setSelectedOrgId(null)
    queryClient.clear()
    toast.success('Signed out')
    window.location.reload()
  }

  useEffect(() => {
    if (!hasApiKey || !selectedOrgId) {
      return
    }
    if (lastPrefetchedOrg.current === selectedOrgId) {
      return
    }
    lastPrefetchedOrg.current = selectedOrgId

    void queryClient.prefetchQuery({
      queryKey: queryKeys.consents({ limit: 100 }),
      queryFn: () => getConsents({ limit: 100 }),
    })
    void queryClient.prefetchQuery({
      queryKey: queryKeys.consents({ limit: 1000 }),
      queryFn: () => getConsents({ limit: 1000 }),
    })
    void queryClient.prefetchQuery({
      queryKey: queryKeys.rights(),
      queryFn: () => getRights(),
    })
    void queryClient.prefetchQuery({
      queryKey: queryKeys.users(),
      queryFn: () => getUsers(),
    })
    void queryClient.prefetchQuery({
      queryKey: queryKeys.purposes(),
      queryFn: () => getPurposes(),
    })
    void queryClient.prefetchQuery({
      queryKey: queryKeys.policies(),
      queryFn: () => getPolicies(),
    })
    void queryClient.prefetchQuery({
      queryKey: queryKeys.webhooks(),
      queryFn: () => getWebhooks(),
    })
    void queryClient.prefetchQuery({
      queryKey: queryKeys.organizations(),
      queryFn: () => getOrganizations(),
    })
    void queryClient.prefetchInfiniteQuery({
      queryKey: queryKeys.auditLogs(),
      queryFn: ({ pageParam = 0 }) =>
        getAuditLogs({ limit: 50, offset: pageParam }),
      initialPageParam: 0,
    })
  }, [hasApiKey, selectedOrgId, queryClient])

  return (
    <>
      <div className="flex h-16 items-center justify-between border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">Organization</span>
          <select
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            value={selectedOrgId || ''}
            onChange={(e) => {
              const orgId = parseInt(e.target.value, 10)
              if (!isNaN(orgId)) {
                handleOrgChange(orgId)
              }
            }}
            disabled={!organizations || organizations.length === 0}
          >
            {!organizations || organizations.length === 0 ? (
              <option>No organizations</option>
            ) : (
              organizations.map((org: Organization) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))
            )}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="h-5 w-5" />
          </Button>
          {hasApiKey && (
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Log out
            </Button>
          )}
        </div>
      </div>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent onClose={() => setSettingsOpen(false)}>
          <DialogHeader>
            <DialogTitle>API Key Settings</DialogTitle>
            <DialogDescription>
              Enter your ConsentVault API key to authenticate requests.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="api-key">API Key</Label>
              <Input
                id="api-key"
                type="password"
                placeholder="cv_..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveApiKey} className="flex-1">
                Save
              </Button>
              {hasApiKey && (
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="flex-1"
                >
                  Log out
                </Button>
              )}
            </div>
          </div>
          <DialogFooter />
        </DialogContent>
      </Dialog>
    </>
  )
}

export function LockScreen() {
  const [apiKey, setApiKey] = useState<string>('')

  const handleSaveApiKey = () => {
    if (!apiKey.trim()) {
      toast.error('Please enter an API key')
      return
    }
    localStorage.setItem(STORAGE_KEY, apiKey)
    toast.success('API key saved successfully')
    window.location.reload()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted/20">
      <div className="glass-card w-full max-w-md space-y-6 p-8">
        <div className="flex items-center justify-center">
          <Lock className="h-12 w-12 text-primary" />
        </div>
        <div className="space-y-2 text-center">
          <h1 className="font-display text-2xl font-semibold">
            ConsentVault Admin
          </h1>
          <p className="text-sm text-muted-foreground">
            Please enter your API key to continue
          </p>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lock-api-key">API Key</Label>
            <Input
              id="lock-api-key"
              type="password"
              placeholder="cv_..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSaveApiKey()
                }
              }}
            />
          </div>
          <Button onClick={handleSaveApiKey} className="w-full">
            Continue
          </Button>
        </div>
      </div>
    </div>
  )
}
