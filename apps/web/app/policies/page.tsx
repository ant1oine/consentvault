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
import { getPolicies, createPolicy, getPurposes } from '@/lib/api'
import { Settings, Edit2 } from 'lucide-react'
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

export default function PoliciesPage() {
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedPolicy, setSelectedPolicy] = useState<number | null>(null)
  const [retentionDays, setRetentionDays] = useState('')
  const [purposeId, setPurposeId] = useState('')
  const queryClient = useQueryClient()

  const { data: policies, isLoading } = useQuery({
    queryKey: ['policies'],
    queryFn: () => getPolicies(),
  })

  const { data: purposes } = useQuery({
    queryKey: ['purposes'],
    queryFn: () => getPurposes(),
  })

  const updateMutation = useMutation({
    mutationFn: (data: {
      purpose_id: number
      retention_days: number
      active?: boolean
    }) => createPolicy(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] })
      toast.success('Policy updated successfully')
      setEditDialogOpen(false)
      setSelectedPolicy(null)
      setRetentionDays('')
      setPurposeId('')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update policy')
    },
  })

  const handleEditClick = (policy: typeof policies[0]) => {
    setSelectedPolicy(policy.id)
    setRetentionDays(policy.retention_days.toString())
    setPurposeId(policy.purpose_id.toString())
    setEditDialogOpen(true)
  }

  const handleUpdate = () => {
    if (!retentionDays || !purposeId) {
      toast.error('Please fill in all fields')
      return
    }
    const days = parseInt(retentionDays, 10)
    if (isNaN(days) || days <= 0) {
      toast.error('Retention days must be a positive number')
      return
    }
    updateMutation.mutate({
      purpose_id: parseInt(purposeId, 10),
      retention_days: days,
      active: true,
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold">
              Retention Policies
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage data retention policies
            </p>
          </div>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Settings className="h-3 w-3" />
            Administrative Area
          </span>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Policy List</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !policies || policies.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No policies found. Create your first policy to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Purpose ID</TableHead>
                    <TableHead>Retention Days</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {policies.map((policy) => (
                    <TableRow key={policy.id}>
                      <TableCell className="font-mono">
                        {policy.purpose_id}
                      </TableCell>
                      <TableCell className="font-medium">
                        {policy.retention_days} days
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            policy.active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {policy.active ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {new Date(policy.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditClick(policy)}
                        >
                          <Edit2 className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent onClose={() => setEditDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>Edit Retention Policy</DialogTitle>
            <DialogDescription>
              Update the retention period for this policy.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="policy-purpose">Purpose</Label>
              <select
                id="policy-purpose"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={purposeId}
                onChange={(e) => setPurposeId(e.target.value)}
              >
                <option value="">Select a purpose</option>
                {purposes?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} (ID: {p.id})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="policy-days">Retention Days *</Label>
              <Input
                id="policy-days"
                type="number"
                min="1"
                placeholder="e.g., 365"
                value={retentionDays}
                onChange={(e) => setRetentionDays(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

