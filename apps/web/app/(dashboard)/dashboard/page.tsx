"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

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
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600">Loading overview...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div>
        <h1 className="text-2xl font-semibold mb-4">Overview</h1>
        <p className="text-gray-600">No stats found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Overview</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Consents" value={stats.consents_total} />
        <StatCard label="Revocations" value={stats.revocations_total} />
        <StatCard label="Subjects" value={stats.subjects_total} />
        <StatCard label="API Calls" value={stats.api_calls_total} />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white p-4 border rounded-lg text-center shadow-sm">
      <p className="text-gray-500 text-sm mb-1">{label}</p>
      <p className="text-2xl font-semibold text-gray-900">{value.toLocaleString()}</p>
    </div>
  );
}
