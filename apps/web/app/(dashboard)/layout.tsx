"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import TopNav from "@/components/layout/TopNav";
import Sidebar from "@/components/layout/sidebar";
import Spinner from "@/components/ui/Spinner";
import { useAuth } from "@/components/providers/AuthProvider";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return <Spinner />;
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-slate-50 to-white text-slate-800 antialiased">
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}

