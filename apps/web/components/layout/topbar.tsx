'use client'

import { useState, useEffect } from 'react'
import { Settings, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import { getOrganizations, Organization } from '@/lib/api'

export function TopBar() {
  const [apiKey, setApiKey] = useState<string>('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [hasApiKey, setHasApiKey] = useState(false)
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null)

  const { data: organizations } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => getOrganizations(),
    enabled: hasApiKey,
    retry: false,
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('consentvault_api_key')
      setHasApiKey(!!stored)
      if (stored) {
        setApiKey(stored)
      }

      // Load selected organization
      const storedOrgId = localStorage.getItem('selectedOrgId')
      if (storedOrgId) {
        setSelectedOrgId(parseInt(storedOrgId, 10))
      }
    }
  }, [])

  // Set default organization when organizations load
  useEffect(() => {
    if (organizations && organizations.length > 0 && !selectedOrgId) {
      const firstOrgId = organizations[0].id
      setSelectedOrgId(firstOrgId)
      if (typeof window !== 'undefined') {
        localStorage.setItem('selectedOrgId', firstOrgId.toString())
      }
    }
  }, [organizations, selectedOrgId])

  const handleOrgChange = (orgId: number) => {
    setSelectedOrgId(orgId)
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedOrgId', orgId.toString())
    }
    toast.success('Organization switched')
  }

  const handleSaveApiKey = () => {
    if (!apiKey.trim()) {
      toast.error('Please enter an API key')
      return
    }
    localStorage.setItem('consentvault_api_key', apiKey)
    setHasApiKey(true)
    setSettingsOpen(false)
    toast.success('API key saved successfully')
    window.location.reload()
  }

  const handleClearApiKey = () => {
    localStorage.removeItem('consentvault_api_key')
    setApiKey('')
    setHasApiKey(false)
    setSettingsOpen(false)
    toast.success('API key cleared')
    window.location.reload()
  }

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
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSettingsOpen(true)}
        >
          <Settings className="h-5 w-5" />
        </Button>
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
                  onClick={handleClearApiKey}
                  className="flex-1"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
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
    localStorage.setItem('consentvault_api_key', apiKey)
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

