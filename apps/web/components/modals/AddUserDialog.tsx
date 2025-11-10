'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { createUser, UserCreate } from '@/lib/api'
import { toast } from 'sonner'

interface AddUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddUserDialog({ open, onOpenChange }: AddUserDialogProps) {
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState<'ADMIN' | 'AUDITOR' | 'VIEWER'>('VIEWER')
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (data: UserCreate) => createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User created successfully')
      onOpenChange(false)
      setEmail('')
      setDisplayName('')
      setRole('VIEWER')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create user')
    },
  })

  const handleCreate = () => {
    if (!email.trim()) {
      toast.error('Please enter an email address')
      return
    }
    createMutation.mutate({
      email: email.trim(),
      display_name: displayName.trim() || undefined,
      role: role,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>Add User</DialogTitle>
          <DialogDescription>
            Create a new user in your organization. All changes are immutably audit-logged.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="user-email">Email *</Label>
            <Input
              id="user-email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreate()
                }
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-display-name">Display Name</Label>
            <Input
              id="user-display-name"
              placeholder="Optional display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-role">Role *</Label>
            <Select
              id="user-role"
              value={role}
              onChange={(e) => setRole(e.target.value as 'ADMIN' | 'AUDITOR' | 'VIEWER')}
            >
              <option value="VIEWER">VIEWER</option>
              <option value="AUDITOR">AUDITOR</option>
              <option value="ADMIN">ADMIN</option>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
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
  )
}





