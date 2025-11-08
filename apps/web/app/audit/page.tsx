'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { getAuditLogs } from '@/lib/api'
import { Lock } from 'lucide-react'
import { motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { queryKeys } from '@/lib/queryKeys'

export default function AuditPage() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: queryKeys.auditLogs(),
    queryFn: ({ pageParam = 0 }) =>
      getAuditLogs({ limit: 50, offset: pageParam }),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < 50) return undefined
      return allPages.length * 50
    },
    initialPageParam: 0,
  })

  const observerTarget = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { threshold: 0.1 }
    )

    const target = observerTarget.current
    if (target) {
      observer.observe(target)
    }

    return () => {
      if (target) {
        observer.unobserve(target)
      }
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const logs = data?.pages.flatMap((page) => page) || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Audit Logs</h1>
        <p className="text-muted-foreground mt-2">
          Immutable audit trail of all system events
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
              <CardTitle>Audit Trail</CardTitle>
              <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-1.5 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" />
                <span>Immutable ledger entry</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(10)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : logs.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No audit logs found
                </div>
              ) : (
                <>
                  {logs.map((log, index) => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.02 }}
                      className="flex items-start gap-4 border-b border-border pb-4 last:border-0"
                    >
                      <Lock className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{log.event_type}</span>
                          <span className="text-xs text-muted-foreground">
                            {log.object_type}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>ID: {log.object_id}</span>
                          <span>
                            {new Date(log.created_at).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                          <span>Hash: {log.entry_hash.slice(0, 16)}...</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  <div ref={observerTarget} className="h-4" />
                  {isFetchingNextPage && (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
