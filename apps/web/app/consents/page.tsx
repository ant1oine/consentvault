'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { getConsents } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import { Lock, HelpCircle } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { motion } from 'framer-motion'
import { usePageAnalytics } from '@/lib/analytics'

export default function ConsentsPage() {
  usePageAnalytics('consents')
  const { data: consents, isLoading } = useQuery({
    queryKey: queryKeys.consents({ limit: 100 }),
    queryFn: () => getConsents({ limit: 100 }),
  })

  const consentList = consents || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Consents</h1>
        <p className="text-muted-foreground mt-2">
          View all consent records (read-only)
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Consent Records</CardTitle>
              <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-1.5 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" />
                <span>Immutable ledger entry</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : consentList.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No consents found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Event</TableHead>
                    <TableHead>Evidence</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consentList.map((consent) => (
                    <TableRow key={consent.id}>
                      <TableCell className="font-mono text-sm">
                        {consent.external_user_id}
                      </TableCell>
                      <TableCell>
                        {consent.purpose_code || `Purpose #${consent.purpose_id}`}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            consent.status === 'granted'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {consent.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {new Date(consent.last_event_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {consent.evidence_ref || '—'}
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Lock className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Immutable ledger entry</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
