'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getOrganizations, createOrganization, CreateOrgResponse } from '@/lib/api'
import { Plus, Settings, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
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
import { useState } from 'react'

const DATA_REGIONS = ['KSA', 'UAE', 'Qatar', 'Bahrain', 'Oman', 'Kuwait']

export default function OrganizationsPage() {
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [successDialogOpen, setSuccessDialogOpen] = useState(false)
  const [createdOrgData, setCreatedOrgData] = useState<CreateOrgResponse | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [dataRegion, setDataRegion] = useState('KSA')
  const queryClient = useQueryClient()

  const { data: organizations, isLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => getOrganizations(),
  })

  const createMutation = useMutation({
    mutationFn: (data: { name: string; data_region: string }) =>
      createOrganization(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
      toast.success('Organization created successfully')
      setAddDialogOpen(false)
      setName('')
      setDataRegion('KSA')
      setCreatedOrgData(data)
      setSuccessDialogOpen(true)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create organization')
    },
  })

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error('Please enter an organization name')
      return
    }
    createMutation.mutate({
      name: name.trim(),
      data_region: dataRegion,
    })
  }

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopiedField(null), 2000)
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold">Organizations</h1>
            <p className="text-muted-foreground mt-2">
              Manage organizations and their API keys
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Settings className="h-3 w-3" />
              Administrative Area
            </span>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Organization
            </Button>
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Organization List</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !organizations || organizations.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No organizations found. Create your first organization to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization Name</TableHead>
                    <TableHead>Data Region</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organizations.map((org) => (
                    <motion.tr
                      key={org.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <TableCell className="font-medium">{org.name}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800">
                          {org.data_region}
                        </span>
                      </TableCell>
                      <TableCell>
                        {new Date(org.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">—</span>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Add Organization Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent onClose={() => setAddDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>Add Organization</DialogTitle>
            <DialogDescription>
              Create a new organization. An API key and HMAC secret will be automatically generated.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">Organization Name *</Label>
              <Input
                id="org-name"
                placeholder="e.g., Acme Corp"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreate()
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-region">Data Region *</Label>
              <select
                id="org-region"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={dataRegion}
                onChange={(e) => setDataRegion(e.target.value)}
              >
                {DATA_REGIONS.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog with API Key and HMAC Secret */}
      <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <DialogContent onClose={() => setSuccessDialogOpen(false)} className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Organization Created Successfully</DialogTitle>
            <DialogDescription>
              Save these credentials now. They will not be shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {createdOrgData && (
              <>
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded-md border border-input bg-muted px-3 py-2 text-sm font-mono break-all">
                      {createdOrgData.api_key}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopy(createdOrgData.api_key, 'api_key')}
                    >
                      {copiedField === 'api_key' ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>HMAC Secret</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded-md border border-input bg-muted px-3 py-2 text-sm font-mono break-all">
                      {createdOrgData.hmac_secret}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopy(createdOrgData.hmac_secret, 'hmac_secret')}
                    >
                      {copiedField === 'hmac_secret' ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setSuccessDialogOpen(false)}>
              I've Saved These Credentials
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

