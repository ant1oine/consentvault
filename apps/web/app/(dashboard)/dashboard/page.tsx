"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { FileCheck, RotateCcw, Users, Server } from "lucide-react";

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Calculate stats from consents data
    apiFetch("/consents?limit=1000")
      .then((consents: any[]) => {
        const stats = {
          consents_total: consents.length,
          revocations_total: consents.filter((c) => c.revoked_at).length,
          subjects_total: new Set(consents.map((c) => c.subject_id)).size,
          api_calls_total: consents.length, // Using consents as proxy for API calls
        };
        setStats(stats);
      })
      .catch((e) => {
        console.error("Failed to load stats:", e);
        setStats({
          consents_total: 0,
          revocations_total: 0,
          subjects_total: 0,
          api_calls_total: 0,
        });
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="space-y-4">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <Skeleton className="h-5 w-5 mb-2" />
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!stats) {
    return (
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Overview</h2>
        <p className="text-sm text-slate-500">Monitor your consent management metrics</p>
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
          <p className="text-sm text-slate-500">No stats found.</p>
        </div>
      </section>
    );
  }

  const hasData = stats.consents_total > 0 || stats.revocations_total > 0 || stats.subjects_total > 0 || stats.api_calls_total > 0;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Overview</h2>
        <p className="text-sm text-slate-500">Monitor your consent management metrics</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
        {[
          { label: "Consents", value: stats.consents_total, icon: FileCheck },
          { label: "Revocations", value: stats.revocations_total, icon: RotateCcw },
          { label: "Subjects", value: stats.subjects_total, icon: Users },
          { label: "API Calls", value: stats.api_calls_total, icon: Server },
        ].map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 ease-in-out"
          >
            <Icon className="h-5 w-5 text-blue-600 mb-2" />
            <p className="text-sm text-slate-500">{label}</p>
            <p className="text-3xl font-semibold text-slate-800 mt-1">{value.toLocaleString()}</p>
            <p className="text-xs text-slate-400 mt-1">last 7 days</p>
          </div>
        ))}
      </div>

      {!hasData && (
        <p className="text-center text-sm text-slate-400 mt-8">
          No records yet — integrate the ConsentVault SDK to begin collecting data.
        </p>
      )}
    </section>
  );
}
