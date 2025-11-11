"use client";

import OrgSwitcher from "./OrgSwitcher";
import { useAuth } from "@/components/providers/AuthProvider";
import { User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export default function TopNav() {
  const { logout, user } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="flex items-center justify-between h-14 px-6">
        <div className="flex items-center gap-3">
          <h1 className="font-semibold text-slate-900 tracking-tight">ConsentVault</h1>
          <span className="text-xs text-slate-400">v1.0.3</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search logs, consents, or users..."
              className="h-8 w-64 rounded-md border border-slate-200 bg-slate-50 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <kbd className="absolute right-2 top-1 text-[10px] text-slate-400">⌘ K</kbd>
          </div>
          <OrgSwitcher />
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 transition-all">
              <User className="h-4 w-4" />
              <span>{user?.email?.split("@")[0] || "Admin"}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem onClick={logout} className="text-red-600">
                Log Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

