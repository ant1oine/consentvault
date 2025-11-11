"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Activity, FileCheck, UserCog } from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

  const monitoringItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "API Logs", href: "/api-logs", icon: Activity },
  ];

  const governanceItems = [
    { name: "Consents", href: "/consents", icon: FileCheck },
    { name: "Data Rights", href: "/data-rights", icon: UserCog },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-slate-50 border-r border-slate-200">
      <nav className="flex-1 p-4 space-y-6">
        <div>
          <h3 className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Monitoring
          </h3>
          <div className="space-y-1">
            {monitoringItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-150",
                    isActive
                      ? "text-slate-900 bg-slate-100 before:absolute before:left-0 before:w-[3px] before:h-full before:bg-blue-600"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  <Icon className={cn("h-4 w-4", isActive ? "text-blue-600" : "text-slate-400")} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Governance
          </h3>
          <div className="space-y-1">
            {governanceItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-150",
                    isActive
                      ? "text-slate-900 bg-slate-100 before:absolute before:left-0 before:w-[3px] before:h-full before:bg-blue-600"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  <Icon className={cn("h-4 w-4", isActive ? "text-blue-600" : "text-slate-400")} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </aside>
  );
}
