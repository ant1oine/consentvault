'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
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
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Consents', href: '/consents', icon: FileCheck },
  { name: 'Data Rights', href: '/rights', icon: Shield },
  { name: 'Audit Logs', href: '/audit', icon: FileText },
  { name: 'Organizations', href: '/organizations', icon: Building2, admin: true },
  { name: 'Purposes', href: '/purposes', icon: Target, admin: true },
  { name: 'Retention Policies', href: '/policies', icon: Clock, admin: true },
  { name: 'Webhooks', href: '/webhooks', icon: Webhook, admin: true },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center border-b border-border px-6">
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary" />
          <span className="font-display text-lg font-semibold">ConsentVault</span>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
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
              {item.admin && (
                <span className="ml-auto text-xs opacity-70">⚙️</span>
              )}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-border p-4 text-xs text-muted-foreground">
        <p className="leading-relaxed">
          All consent and rights events are cryptographically linked and cannot be altered.
        </p>
      </div>
    </div>
  )
}

