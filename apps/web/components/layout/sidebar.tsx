'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/components/providers/AuthContext'
import {
  LayoutDashboard,
  FileCheck,
  Shield,
  FileText,
  Target,
  Clock,
  Webhook,
  Lock,
  Building2,
  Users,
  Activity,
  BarChart3,
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, requiredRole: 'VIEWER' as const },
  { name: 'Consents', href: '/consents', icon: FileCheck, requiredRole: 'VIEWER' as const },
  { name: 'Data Rights', href: '/rights', icon: Shield, requiredRole: 'VIEWER' as const },
  { name: 'Audit Logs', href: '/audit', icon: FileText, requiredRole: 'AUDITOR' as const },
  { name: 'Organizations', href: '/organizations', icon: Building2, requiredRole: 'SUPERADMIN' as const },
  { name: 'Users', href: '/users', icon: Users, requiredRole: 'AUDITOR' as const },
  { name: 'Purposes', href: '/purposes', icon: Target, requiredRole: 'ADMIN' as const },
  { name: 'Retention Policies', href: '/policies', icon: Clock, requiredRole: 'ADMIN' as const },
  { name: 'Webhooks', href: '/webhooks', icon: Webhook, requiredRole: 'ADMIN' as const },
]

export function Sidebar() {
  const pathname = usePathname()
  const { hasPermission, isSuperAdmin } = useAuth()

  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center border-b border-border px-6">
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary" />
          <span className="font-display text-lg font-semibold">ConsentVault</span>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation
          .filter((item) => hasPermission(item.requiredRole))
          .map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.name}</span>
                {item.requiredRole !== 'VIEWER' && (
                  <span className="ml-auto text-xs opacity-70">⚙️</span>
                )}
              </Link>
            )
          })}
        {isSuperAdmin && (
          <>
            <Link
              href="/audit/ui"
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                pathname === '/audit/ui'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Activity className="h-5 w-5" />
              <span>Activity Feed</span>
              <span className="ml-auto text-xs opacity-70">⚙️</span>
            </Link>
            <Link
              href="/audit/overview"
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                pathname === '/audit/overview'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <BarChart3 className="h-5 w-5" />
              <span>Compliance Overview</span>
              <span className="ml-auto text-xs opacity-70">⚙️</span>
            </Link>
          </>
        )}
      </nav>
      <div className="border-t border-border p-4 text-xs text-muted-foreground">
        <p className="leading-relaxed">
          All consent and rights events are cryptographically linked and cannot be altered.
        </p>
      </div>
    </div>
  )
}

