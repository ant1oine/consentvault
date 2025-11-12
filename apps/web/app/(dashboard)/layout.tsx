"use client";

import type { ReactNode } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TopNav from "@/components/layout/TopNav";
import AuthGuard from "@/components/auth/AuthGuard";
import CommandPalette from "@/components/controls/CommandPalette";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex h-screen bg-gray-50">
        <aside className="hidden md:block fixed top-0 left-0 h-full w-60 z-20 border-r border-gray-200 bg-white">
          <Sidebar />
        </aside>

        <div className="flex flex-col flex-1 md:ml-60">
          <header className="fixed top-0 left-0 md:left-60 right-0 h-14 z-10 bg-white border-b border-gray-200 shadow-sm">
            <TopNav />
          </header>

          <main className="flex-1 overflow-y-auto pt-14 px-6">{children}</main>
        </div>
      </div>
      <CommandPalette />
    </AuthGuard>
  );
}
