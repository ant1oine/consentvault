'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { getConsents, getRights, getPurposes } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { FileCheck, XCircle, Shield, Target } from 'lucide-react'
import { useAuth } from '@/components/providers/AuthContext'
import { usePageAnalytics } from '@/lib/analytics'

function AnimatedCounter({ value }: { value: number }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="text-3xl font-bold"
    >
      {value.toLocaleString()}
    </motion.span>
  )
}

export default function DashboardPage() {
  usePageAnalytics('dashboard')
  const { apiKey, org } = useAuth()

  const { data: consents, isLoading: consentsLoading } = useQuery({
    queryKey: queryKeys.consents({ limit: 1000 }),
    queryFn: () => getConsents({ limit: 1000 }),
    enabled: !!apiKey,
  })

  const { data: rights, isLoading: rightsLoading } = useQuery({
    queryKey: queryKeys.rights(),
    queryFn: () => getRights(),
    enabled: !!apiKey,
  })

  const { data: purposes, isLoading: purposesLoading } = useQuery({
    queryKey: queryKeys.purposes(),
    queryFn: () => getPurposes(),
    enabled: !!apiKey,
  })

  const stats = useMemo(() => {
    const totalConsents = consents?.length || 0
    const totalWithdrawals =
      consents?.filter((c) => c.status === 'withdrawn').length || 0
    const openRights = rights?.filter((r) => r.status === 'open').length || 0
    const activePurposes = purposes?.filter((p) => p.active).length || 0

    return {
      totalConsents,
      totalWithdrawals,
      openRights,
      activePurposes,
    }
  }, [consents, rights, purposes])

  const isLoading = consentsLoading || rightsLoading || purposesLoading

  const cards = [
    {
      title: 'Total Consents',
      value: stats.totalConsents,
      icon: FileCheck,
      color: 'text-blue-600',
    },
    {
      title: 'Total Withdrawals',
      value: stats.totalWithdrawals,
      icon: XCircle,
      color: 'text-red-600',
    },
    {
      title: 'Open Rights Requests',
      value: stats.openRights,
      icon: Shield,
      color: 'text-orange-600',
    },
    {
      title: 'Active Purposes',
      value: stats.activePurposes,
      icon: Target,
      color: 'text-green-600',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Overview of your consent management system
        </p>
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-4 bg-muted rounded-lg text-sm">
            <p>API Key: {apiKey ? apiKey.slice(0, 8) + '...' : 'Not logged in'}</p>
            <p>Org: {org ? org.name : 'None'}</p>
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, index) => {
          const Icon = card.icon
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card className="glass-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {card.title}
                  </CardTitle>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <AnimatedCounter value={card.value} />
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
