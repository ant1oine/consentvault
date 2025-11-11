"use client";

import OrgSwitcher from "./OrgSwitcher";
import { useAuth } from "@/components/providers/AuthProvider";
import { LogOut } from "lucide-react";

export default function TopNav() {
  const { logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="flex h-14 items-center justify-between px-6">
        <div className="font-semibold text-slate-900 tracking-tight">ConsentVault</div>
        <div className="flex items-center gap-4">
          <OrgSwitcher />
          <button
            onClick={logout}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 transition-all"
          >
            <LogOut className="h-4 w-4" /> Log Out
          </button>
        </div>
      </div>
    </header>
  );
}

