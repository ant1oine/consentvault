'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { getAdminAuditLogs, AdminAuditLogResponse } from '@/lib/api'
import { useAuth } from '@/components/providers/AuthContext'
import { usePageAnalytics } from '@/lib/analytics'
import { RefreshCw, Activity, Download } from 'lucide-react'
import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'

function parseEventType(log: AdminAuditLogResponse): 'UI' | 'API' | 'SYSTEM' {
  if (log.path === 'ui-event' || log.method === 'UI') {
    return 'UI'
  }
  if (log.path.startsWith('/v1/')) {
    return 'API'
  }
  return 'SYSTEM'
}

function parseEventDetails(log: AdminAuditLogResponse): { event?: string; details?: any } | null {
  if (log.request_body) {
    try {
      return JSON.parse(log.request_body)
    } catch {
      return null
    }
  }
  return null
}

export default function AuditFeedPage() {
  const { isSuperAdmin, org, apiKey } = useAuth()
  usePageAnalytics('audit_feed_view')

  const [filterOrg, setFilterOrg] = useState<number | null>(null)

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['adminAuditLogs', org?.id],
    queryFn: () => getAdminAuditLogs(100),
    enabled: isSuperAdmin,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  })

  const filteredData = useMemo(() => {
    if (!data) return []
    if (filterOrg === null) return data
    return data.filter((log) => log.organization_id === filterOrg)
  }, [data, filterOrg])

  // Get unique organization IDs for filter (must be before conditional returns)
  const orgIds = useMemo(() => {
    if (!data) return []
    const ids = new Set(data.map((log) => log.organization_id))
    return Array.from(ids).sort((a, b) => a - b)
  }, [data])

  const handleExport = async (format: 'csv' | 'json') => {
    if (!apiKey) {
      alert('API key not found. Please log in again.')
      return
    }

    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const res = await fetch(`${apiBaseUrl}/v1/admin/audit/export?format=${format}`, {
        headers: { 'X-Api-Key': apiKey },
      })

      if (!res.ok) {
        if (res.status === 403) {
          alert('Access denied: Only superadmins can export audit logs.')
        } else {
          alert(`Export failed: ${res.statusText}`)
        }
        return
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // Get filename from Content-Disposition header or use default
      const contentDisposition = res.headers.get('Content-Disposition')
      let filename = `audit_logs.${format}`
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/i)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }
      
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export audit logs. Please try again.')
    }
  }

  const handleExportSigned = async (format: 'csv' | 'json') => {
    if (!apiKey) {
      alert('API key not found. Please log in again.')
      return
    }

    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      
      // Fetch signed export (includes both data and signature)
      const res = await fetch(`${apiBaseUrl}/v1/admin/audit/export/signed?format=${format}`, {
        headers: { 'X-Api-Key': apiKey },
      })

      if (!res.ok) {
        if (res.status === 403) {
          alert('Access denied: Only superadmins can export signed audit logs.')
        } else {
          alert(`Signed export failed: ${res.statusText}`)
        }
        return
      }

      const { data, data_filename, signature, signature_filename } = await res.json()
      
      // Download the export data file
      const dataBlob = new Blob([atob(data)], { 
        type: format === 'json' ? 'application/json' : 'text/csv' 
      })
      const dataUrl = URL.createObjectURL(dataBlob)
      const dataLink = document.createElement('a')
      dataLink.href = dataUrl
      dataLink.download = data_filename
      document.body.appendChild(dataLink)
      dataLink.click()
      document.body.removeChild(dataLink)
      URL.revokeObjectURL(dataUrl)
      
      // Download the signature file
      const sigBlob = new Blob([signature], { type: 'text/plain' })
      const sigUrl = URL.createObjectURL(sigBlob)
      const sigLink = document.createElement('a')
      sigLink.href = sigUrl
      sigLink.download = signature_filename
      document.body.appendChild(sigLink)
      sigLink.click()
      document.body.removeChild(sigLink)
      URL.revokeObjectURL(sigUrl)
    } catch (error) {
      console.error('Signed export error:', error)
      alert('Failed to export signed audit logs. Please try again.')
    }
  }

  if (!isSuperAdmin) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p className="text-lg font-semibold mb-2">Access Denied</p>
        <p>Only superadmins can view the System Activity Feed.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-24" />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-3">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive mb-2 font-semibold">Failed to load audit logs</p>
        <p className="text-muted-foreground mb-4">
          {error instanceof Error ? error.message : 'Unknown error'}
        </p>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">System Activity Feed</h1>
        <p className="text-muted-foreground mt-2">
          Real-time view of all UI and API events across all organizations
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
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Activity Feed
              </CardTitle>
              <div className="flex items-center gap-3">
                {orgIds.length > 0 && (
                  <select
                    value={filterOrg ?? ''}
                    onChange={(e) =>
                      setFilterOrg(e.target.value === '' ? null : parseInt(e.target.value))
                    }
                    className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                  >
                    <option value="">All Organizations</option>
                    {orgIds.map((orgId) => (
                      <option key={orgId} value={orgId}>
                        Org {orgId}
                      </option>
                    ))}
                  </select>
                )}
                <Button
                  onClick={() => refetch()}
                  variant="outline"
                  size="sm"
                  disabled={isFetching}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button
                  onClick={() => handleExport('csv')}
                  variant="outline"
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button
                  onClick={() => handleExport('json')}
                  variant="outline"
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export JSON
                </Button>
                <Button
                  onClick={() => handleExportSigned('csv')}
                  variant="outline"
                  size="sm"
                  className="text-blue-600 hover:text-blue-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV + Signature
                </Button>
                <Button
                  onClick={() => handleExportSigned('json')}
                  variant="outline"
                  size="sm"
                  className="text-blue-600 hover:text-blue-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export JSON + Signature
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredData.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No audit logs found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-3 font-semibold">Event Type</th>
                      <th className="text-left p-3 font-semibold">Method</th>
                      <th className="text-left p-3 font-semibold">Path</th>
                      <th className="text-left p-3 font-semibold">Status</th>
                      <th className="text-left p-3 font-semibold">Org</th>
                      <th className="text-left p-3 font-semibold">API Key</th>
                      <th className="text-left p-3 font-semibold">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((log, index) => {
                      const eventType = parseEventType(log)
                      const eventDetails = parseEventDetails(log)
                      const isError = log.status_code >= 400

                      return (
                        <motion.tr
                          key={log.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2, delay: index * 0.01 }}
                          className={`border-b border-border hover:bg-muted/50 ${
                            isError ? 'bg-destructive/5' : ''
                          }`}
                        >
                          <td className="p-3">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                                eventType === 'UI'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : eventType === 'API'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                              }`}
                            >
                              {eventType}
                            </span>
                            {eventDetails?.event && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {eventDetails.event}
                              </div>
                            )}
                          </td>
                          <td className="p-3 font-mono text-xs">{log.method}</td>
                          <td className="p-3">
                            <div className="truncate max-w-xs" title={log.path}>
                              {log.path}
                            </div>
                          </td>
                          <td className="p-3">
                            <span
                              className={`font-medium ${
                                isError
                                  ? 'text-destructive'
                                  : log.status_code >= 300
                                  ? 'text-yellow-600 dark:text-yellow-400'
                                  : 'text-green-600 dark:text-green-400'
                              }`}
                            >
                              {log.status_code}
                            </span>
                          </td>
                          <td className="p-3 text-muted-foreground">{log.organization_id}</td>
                          <td className="p-3 text-muted-foreground font-mono text-xs">
                            {log.api_key_id}
                          </td>
                          <td className="p-3 text-muted-foreground text-xs">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                        </motion.tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

