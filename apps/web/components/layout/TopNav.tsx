"use client";

import OrgSwitcher from "./OrgSwitcher";
import { useAuth } from "@/components/providers/AuthProvider";
import { LogOut } from "lucide-react";

export default function TopNav() {
  const { logout } = useAuth();

  return (
    <header className="flex justify-between items-center h-16 px-6 bg-white border-b border-slate-200 shadow-sm">
      <h1 className="font-semibold text-lg text-slate-800 tracking-tight">ConsentVault</h1>
      <div className="flex items-center gap-4">
        <OrgSwitcher />
        <button
          onClick={logout}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Log Out</span>
        </button>
      </div>
    </header>
  );
}

