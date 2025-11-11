"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Activity, FileCheck, UserCog, History, ShieldCheck } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";

function SidebarLink({
  icon: Icon,
  label,
  href,
  isActive,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "relative flex items-center gap-2 px-3 py-2 rounded-md font-medium text-slate-800 hover:bg-slate-100 transition-all",
        isActive && "bg-slate-100 before:absolute before:left-0 before:w-[3px] before:h-full before:bg-blue-600"
      )}
    >
      <Icon className="h-4 w-4 text-blue-600" />
      <span className="text-sm">{label}</span>
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { isSuperadmin } = useAuth();

  return (
    <aside className="bg-slate-50 border-r border-slate-200 shadow-inner w-64 min-h-screen flex flex-col">
      <nav className="flex-1 px-3 py-4 space-y-2">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3">
          Monitoring
        </div>
        <SidebarLink
          icon={LayoutDashboard}
          label="Dashboard"
          href="/dashboard"
          isActive={pathname === "/dashboard"}
        />
        <SidebarLink
          icon={Activity}
          label="API Logs"
          href="/api-logs"
          isActive={pathname === "/api-logs"}
        />

        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mt-4">
          Governance
        </div>
        <SidebarLink
          icon={FileCheck}
          label="Consents"
          href="/consents"
          isActive={pathname === "/consents"}
        />
        <SidebarLink
          icon={ShieldCheck}
          label="Data Rights"
          href="/data-rights"
          isActive={pathname === "/data-rights"}
        />
        
        {isSuperadmin && (
          <SidebarLink
            icon={History}
            label="Activity"
            href="/activity"
            isActive={pathname === "/activity"}
          />
        )}
      </nav>
    </aside>
  );
}
