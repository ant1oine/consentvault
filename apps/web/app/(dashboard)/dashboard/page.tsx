"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { FileCheck, RotateCcw, Users, Server, FilePlus } from "lucide-react";

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
      <section>
        <div className="mb-4">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
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
      <section>
        <div className="mb-4">
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Consent Management Overview
          </h2>
          <p className="text-sm text-slate-500">
            Monitor your organization's consent and compliance activity
          </p>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
          <p className="text-sm text-slate-500">No stats found.</p>
        </div>
      </section>
    );
  }

  const hasData =
    stats.consents_total > 0 ||
    stats.revocations_total > 0 ||
    stats.subjects_total > 0 ||
    stats.api_calls_total > 0;

  const cards = [
    { label: "Consents", href: "/consents", Icon: FileCheck, value: stats.consents_total },
    {
      label: "Revocations",
      href: "/consents?tab=revocations",
      Icon: RotateCcw,
      value: stats.revocations_total,
    },
    { label: "Subjects", href: "/consents?tab=subjects", Icon: Users, value: stats.subjects_total },
    { label: "API Calls", href: "/api-logs", Icon: Server, value: stats.api_calls_total },
  ];

  return (
    <section>
      <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">
        Consent Management Overview
      </h2>
      <p className="text-sm text-slate-500">
        Monitor your organization's consent and compliance activity
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-6">
        {cards.map(({ label, href, Icon, value }) => (
          <Link
            key={label}
            href={href}
            className="cursor-pointer flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 ease-in-out"
          >
            <Icon className="h-5 w-5 text-blue-600 mb-2" />
            <p className="text-sm text-slate-500">{label}</p>
            <p className="text-3xl font-semibold text-slate-800 mt-1">{value.toLocaleString()}</p>
          </Link>
        ))}
      </div>

      {!hasData && (
        <div className="mt-8 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-8 text-center">
          <FilePlus className="h-8 w-8 text-blue-600 mb-3" />
          <p className="text-sm text-slate-600">
            No records yet. Start capturing data by integrating the ConsentVault SDK.
          </p>
          <Link
            href="/docs/integration"
            className="mt-3 inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition"
          >
            View Integration Guide
          </Link>
        </div>
      )}
    </section>
  );
}
