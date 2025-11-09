'use client'

import { useState, useEffect, useRef } from 'react'
import { Settings, LogOut } from 'lucide-react'
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
import { useAuth } from '@/components/providers/AuthContext'
import { OrgSwitcher } from '@/components/layout/OrgSwitcher'

export function TopBar() {
  const { apiKey, org, setApiKey, setOrg, logout, isSuperAdmin, role } = useAuth()
  const [apiKeyInput, setApiKeyInput] = useState<string>('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const queryClient = useQueryClient()
  const lastPrefetchedOrg = useRef<number | null>(null)

  const { data: organizations } = useQuery({
    queryKey: queryKeys.organizations(),
    queryFn: () => getOrganizations(),
    enabled: !!apiKey,
    retry: false,
  })

  // Initialize API key input from context
  useEffect(() => {
    if (apiKey) {
      setApiKeyInput(apiKey)
    }
  }, [apiKey])

  // Auto-select first organization if none selected (only for non-superadmins)
  useEffect(() => {
    if (isSuperAdmin) return // Superadmins can stay without org selected
    if (organizations && organizations.length > 0 && !org) {
      const firstOrg = organizations[0]
      setOrg({ id: firstOrg.id, name: firstOrg.name })
    }
  }, [organizations, org, setOrg, isSuperAdmin])

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
    const selectedOrg = organizations?.find((o) => o.id === orgId)
    if (selectedOrg) {
      setOrg({ id: selectedOrg.id, name: selectedOrg.name })
      invalidateOrgScopedQueries()
      toast.success('Organization switched')
    }
  }

  const handleSaveApiKey = () => {
    if (!apiKeyInput.trim()) {
      toast.error('Please enter an API key')
      return
    }
    setApiKey(apiKeyInput)
    setSettingsOpen(false)
    toast.success('API key saved successfully')
    queryClient.clear()
    // Reload to refresh all queries with new key
    window.location.reload()
  }

  const handleLogout = () => {
    logout()
    queryClient.clear()
    toast.success('Signed out')
  }

  useEffect(() => {
    // Skip prefetching for superadmins without org selected
    if (isSuperAdmin && !org?.id) {
      return
    }
    if (!apiKey || !org?.id) {
      return
    }
    if (lastPrefetchedOrg.current === org.id) {
      return
    }
    lastPrefetchedOrg.current = org.id

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
  }, [apiKey, org?.id, queryClient])

  return (
    <>
      <div className="flex h-16 items-center justify-between border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
        <div className="flex items-center gap-4">
          {isSuperAdmin ? (
            <OrgSwitcher />
          ) : (
            <>
              <span className="text-sm text-muted-foreground">Organization</span>
              <select
                className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                value={org?.id || ''}
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
                  organizations.map((organization: Organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.name}
                    </option>
                  ))
                )}
              </select>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {org && (
            <span className="text-sm text-muted-foreground">{org.name}</span>
          )}
          {apiKey && (
            <span className="text-xs text-muted-foreground ml-2 uppercase">
              ({role || 'VIEWER'})
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="h-5 w-5" />
          </Button>
          {apiKey && (
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
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveApiKey} className="flex-1">
                Save
              </Button>
              {apiKey && (
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

