"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PageShell } from "@/components/chrome/PageShell";
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

  return <PageShell>{children}</PageShell>;
}

