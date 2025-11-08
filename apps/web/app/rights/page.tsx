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
import { getRights, completeRight } from '@/lib/api'
import { Lock, CheckCircle2 } from 'lucide-react'
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

export default function RightsPage() {
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null)
  const [evidenceRef, setEvidenceRef] = useState('')
  const queryClient = useQueryClient()

  const { data: rights, isLoading } = useQuery({
    queryKey: queryKeys.rights(),
    queryFn: () => getRights(),
  })

  const completeMutation = useMutation({
    mutationFn: (data: { request_id: string; evidence_ref: string }) =>
      completeRight(data.request_id, { evidence_ref: data.evidence_ref }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rights() })
      toast.success('Rights request marked as complete')
      setCompleteDialogOpen(false)
      setEvidenceRef('')
      setSelectedRequest(null)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to complete request')
    },
  })

  const handleCompleteClick = (requestId: string) => {
    setSelectedRequest(requestId)
    setCompleteDialogOpen(true)
  }

  const handleComplete = () => {
    if (!selectedRequest || !evidenceRef.trim()) {
      toast.error('Please provide an evidence reference')
      return
    }
    completeMutation.mutate({
      request_id: selectedRequest,
      evidence_ref: evidenceRef,
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Data Rights</h1>
        <p className="text-muted-foreground mt-2">
          Manage data rights requests
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Rights Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !rights || rights.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No rights requests found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request ID</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>Right</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Opened At</TableHead>
                    <TableHead>Closed At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rights.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-mono text-sm">
                        {request.id}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {request.external_user_id}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800">
                          {request.right}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            request.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : request.status === 'open'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {request.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {new Date(request.opened_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {request.closed_at
                          ? new Date(request.closed_at).toLocaleString()
                          : '—'}
                      </TableCell>
                      <TableCell>
                        {request.status !== 'completed' && (
                          <Button
                            size="sm"
                            onClick={() => handleCompleteClick(request.id)}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Mark Complete
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent onClose={() => setCompleteDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>Complete Rights Request</DialogTitle>
            <DialogDescription>
              Provide an evidence reference for completing this request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="evidence-ref">Evidence Reference</Label>
              <Input
                id="evidence-ref"
                placeholder="e.g., evidence_12345"
                value={evidenceRef}
                onChange={(e) => setEvidenceRef(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCompleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleComplete}
              disabled={completeMutation.isPending}
            >
              {completeMutation.isPending ? 'Completing...' : 'Complete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
