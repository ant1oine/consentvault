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
import { getUsers, updateUserRole, toggleUserActive, User } from '@/lib/api'
import { Plus, Settings, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { AddUserDialog } from '@/components/modals/AddUserDialog'
import { useState } from 'react'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { queryKeys } from '@/lib/queryKeys'
import ProtectedRoute from '@/components/layout/ProtectedRoute'
import { usePageAnalytics } from '@/lib/analytics'

function UsersTable() {
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data: users, isLoading, error } = useQuery({
    queryKey: queryKeys.users(),
    queryFn: () => getUsers(),
    retry: (failureCount, error) => {
      // Don't retry on FORBIDDEN errors
      if (error instanceof Error && error.message === 'FORBIDDEN') {
        return false
      }
      return failureCount < 3
    },
  })

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: 'ADMIN' | 'AUDITOR' | 'VIEWER' }) =>
      updateUserRole(id, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users() })
      toast.success('User role updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update user role')
    },
  })

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      toggleUserActive(id, { active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users() })
      toast.success('User status updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update user status')
    },
  })

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email)
    setCopiedEmail(email)
    toast.success('Email copied to clipboard')
    setTimeout(() => setCopiedEmail(null), 2000)
  }

  const handleRoleChange = (userId: string, newRole: 'ADMIN' | 'AUDITOR' | 'VIEWER') => {
    updateRoleMutation.mutate({ id: userId, role: newRole })
  }

  const handleActiveToggle = (userId: string, currentActive: boolean) => {
    toggleActiveMutation.mutate({ id: userId, active: !currentActive })
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold">Users</h1>
            <p className="text-muted-foreground mt-2">
              Organization-scoped members and roles. Mutations are audit-logged.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Settings className="h-3 w-3" />
              Administrative Area
            </span>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add User
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
            <CardTitle>Users (Organization)</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : error ? (
              <div className="py-8 text-center">
                {error instanceof Error && error.message === 'FORBIDDEN' ? (
                  <>
                    <p className="text-destructive mb-2 font-semibold">
                      Insufficient Permissions
                    </p>
                    <p className="text-muted-foreground mb-4">
                      Your role does not allow access to this section. Required role: AUDITOR
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-destructive mb-4">Failed to load users</p>
                    <Button
                      variant="outline"
                      onClick={() =>
                        queryClient.invalidateQueries({ queryKey: queryKeys.users() })
                      }
                    >
                      Retry
                    </Button>
                  </>
                )}
              </div>
            ) : !users || users.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <p className="mb-4">No users found.</p>
                <Button onClick={() => setAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add first user
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Display Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopyEmail(user.email)}
                            className="font-medium hover:underline flex items-center gap-1"
                          >
                            {user.email}
                            {copiedEmail === user.email ? (
                              <Check className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3 text-muted-foreground" />
                            )}
                          </button>
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.display_name || (
                          <span className="text-muted-foreground italic">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={user.role}
                          onChange={(e) =>
                            handleRoleChange(
                              user.id,
                              e.target.value as 'ADMIN' | 'AUDITOR' | 'VIEWER'
                            )
                          }
                          disabled={updateRoleMutation.isPending}
                          className="w-32"
                        >
                          <option value="VIEWER">VIEWER</option>
                          <option value="AUDITOR">AUDITOR</option>
                          <option value="ADMIN">ADMIN</option>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={user.active}
                          onCheckedChange={() => handleActiveToggle(user.id, user.active)}
                          disabled={toggleActiveMutation.isPending}
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {new Date(user.updated_at).toLocaleDateString()}
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <AddUserDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
    </div>
  )
}

export default function UsersPage() {
  usePageAnalytics('users')
  return (
    <ProtectedRoute requiredRole="AUDITOR">
      <UsersTable />
    </ProtectedRoute>
  )
}
