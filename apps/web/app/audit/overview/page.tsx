'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { getAuditMetrics, getAuditTimeseries, AuditMetrics, AuditTimeseries } from '@/lib/api'
import { useAuth } from '@/components/providers/AuthContext'
import { usePageAnalytics } from '@/lib/analytics'
import ProtectedRoute from '@/components/layout/ProtectedRoute'
import { OrgSwitcher } from '@/components/layout/OrgSwitcher'
import { RefreshCw, TrendingUp, CheckCircle, AlertCircle, FileX } from 'lucide-react'
import { useState } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

export default function ComplianceOverviewPage() {
  return (
    <ProtectedRoute requiredRole="SUPERADMIN">
      <ComplianceOverviewContent />
    </ProtectedRoute>
  )
}

function ComplianceOverviewContent() {
  const { org } = useAuth()
  const queryClient = useQueryClient()
  usePageAnalytics('compliance_overview_view')

  const [window, setWindow] = useState<'24h' | '7d' | '30d'>('24h')
  const [bucket, setBucket] = useState<'hour' | 'day'>('hour')

  const orgId = org?.id

  const { data: metrics, isLoading: metricsLoading, error: metricsError } = useQuery<AuditMetrics>({
    queryKey: ['audit-metrics', orgId],
    queryFn: () => getAuditMetrics(orgId),
    refetchInterval: 15000,
    staleTime: 5000,
    keepPreviousData: true,
  })

  const { data: timeseries, isLoading: timeseriesLoading, error: timeseriesError } = useQuery<AuditTimeseries>({
    queryKey: ['audit-timeseries', orgId, window, bucket],
    queryFn: () => getAuditTimeseries({ orgId, window, bucket }),
    refetchInterval: 15000,
    staleTime: 5000,
    keepPreviousData: true,
  })

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['audit-metrics'] })
    queryClient.invalidateQueries({ queryKey: ['audit-timeseries'] })
  }

  if (metricsError || timeseriesError) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive mb-2 font-semibold">Failed to load compliance data</p>
        <p className="text-muted-foreground mb-4">
          {metricsError instanceof Error ? metricsError.message : 'Unknown error'}
        </p>
        <Button onClick={handleRefresh} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Compliance Overview</h1>
          <p className="text-muted-foreground mt-2">
            Real-time metrics and analytics for audit logs
          </p>
        </div>
        <div className="flex items-center gap-3">
          <OrgSwitcher />
          <select
            value={window}
            onChange={(e) => setWindow(e.target.value as '24h' | '7d' | '30d')}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          >
            <option value="24h">24 Hours</option>
            <option value="7d">7 Days</option>
            <option value="30d">30 Days</option>
          </select>
          <select
            value={bucket}
            onChange={(e) => setBucket(e.target.value as 'hour' | 'day')}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          >
            <option value="hour">Hour</option>
            <option value="day">Day</option>
          </select>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Events"
          value={metrics?.totals.events ?? 0}
          loading={metricsLoading}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          title="Events (24h)"
          value={metrics?.last_24h.events ?? 0}
          loading={metricsLoading}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          title="Verification Rate"
          value={metrics ? `${(metrics.verification.rate * 100).toFixed(1)}%` : '0%'}
          loading={metricsLoading}
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <StatCard
          title="Unsigned Exports (7d)"
          value={metrics?.recent_unsigned_exports_7d ?? 0}
          loading={metricsLoading}
          icon={<FileX className="h-5 w-5" />}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line Chart - Events over time */}
        <Card>
          <CardHeader>
            <CardTitle>Events Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {timeseriesLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : timeseries?.series ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timeseries.series}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="ts"
                    tickFormatter={(value) => {
                      const date = new Date(value)
                      return window === '24h'
                        ? date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                        : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    }}
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(value) => new Date(value).toLocaleString()}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="events" stroke="#8884d8" name="Events" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stacked Bar Chart - Status codes */}
        <Card>
          <CardHeader>
            <CardTitle>Status Code Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {timeseriesLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : timeseries?.series ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={timeseries.series}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="ts"
                    tickFormatter={(value) => {
                      const date = new Date(value)
                      return window === '24h'
                        ? date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                        : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    }}
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(value) => new Date(value).toLocaleString()}
                  />
                  <Legend />
                  <Bar dataKey="s2xx" stackId="status" fill="#22c55e" name="2xx" />
                  <Bar dataKey="s4xx" stackId="status" fill="#f59e0b" name="4xx" />
                  <Bar dataKey="s5xx" stackId="status" fill="#ef4444" name="5xx" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Endpoints Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Endpoints (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          {metricsLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : metrics?.top_endpoints && metrics.top_endpoints.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 font-semibold">Path</th>
                    <th className="text-right p-3 font-semibold">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.top_endpoints.map((endpoint, index) => (
                    <tr key={index} className="border-b border-border hover:bg-muted/50">
                      <td className="p-3 font-mono text-xs">{endpoint.path}</td>
                      <td className="p-3 text-right">{endpoint.count.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No endpoint data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({
  title,
  value,
  loading,
  icon,
}: {
  title: string
  value: string | number
  loading: boolean
  icon: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        )}
      </CardContent>
    </Card>
  )
}

