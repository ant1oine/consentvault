"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

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
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-6" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6 text-center">
                <Skeleton className="h-4 w-24 mx-auto mb-3" />
                <Skeleton className="h-8 w-16 mx-auto" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="space-y-6">
        <h1 className="text-lg font-semibold text-slate-800">Overview</h1>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-600">No stats found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-800 mb-1">Overview</h1>
        <p className="text-sm text-slate-600">Monitor your consent management metrics</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
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
    <Card>
      <CardContent className="p-6 text-center">
        <p className="text-sm text-slate-600 mb-2 font-medium">{label}</p>
        <p className="text-3xl font-semibold text-slate-800">{value.toLocaleString()}</p>
      </CardContent>
    </Card>
  );
}
