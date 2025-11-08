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
import { getPurposes, createPurpose } from '@/lib/api'
import { Plus, Settings } from 'lucide-react'
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
import { queryKeys } from '@/lib/queryKeys'
import { Textarea } from '@/components/ui/textarea'

export default function PurposesPage() {
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const queryClient = useQueryClient()

  const { data: purposes, isLoading } = useQuery({
    queryKey: queryKeys.purposes(),
    queryFn: () => getPurposes(),
  })

  const createMutation = useMutation({
    mutationFn: (data: { code: string; description?: string | null }) =>
      createPurpose(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purposes() })
      toast.success('Purpose created successfully')
      setAddDialogOpen(false)
      setCode('')
      setDescription('')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create purpose')
    },
  })

  const handleCreate = () => {
    if (!code.trim()) {
      toast.error('Please enter a purpose code')
      return
    }
    createMutation.mutate({
      code: code.trim(),
      description: description.trim() || null,
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold">Purposes</h1>
            <p className="text-muted-foreground mt-2">
              Manage consent purposes
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Settings className="h-3 w-3" />
              Administrative Area
            </span>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Purpose
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
            <CardTitle>Purpose List</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !purposes || purposes.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No purposes found. Create your first purpose to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purposes.map((purpose) => (
                    <TableRow key={purpose.id}>
                      <TableCell className="font-mono font-medium">
                        {purpose.code}
                      </TableCell>
                      <TableCell>
                        {purpose.description || (
                          <span className="text-muted-foreground italic">
                            No description
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            purpose.active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {purpose.active ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {new Date(purpose.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent onClose={() => setAddDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>Add Purpose</DialogTitle>
            <DialogDescription>
              Create a new consent purpose. The code must be unique.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="purpose-code">Code *</Label>
              <Input
                id="purpose-code"
                placeholder="e.g., marketing, analytics"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="purpose-description">Description</Label>
              <Textarea
                id="purpose-description"
                placeholder="Optional description of the purpose"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
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
    </div>
  )
}
