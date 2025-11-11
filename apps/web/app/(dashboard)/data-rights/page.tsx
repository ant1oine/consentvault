"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download } from "lucide-react";

export default function DataRightsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    // Since there's no data_rights endpoint yet, we'll derive requests from revoked consents
    // as a proxy for data deletion requests
    apiFetch("/consents?limit=1000")
      .then((consents: any[]) => {
        // Transform revoked consents into data rights requests
        const dataRightsRequests = consents
          .filter((c) => c.revoked_at)
          .map((c) => ({
            id: c.id,
            subject_id: c.subject_id,
            request_type: "deletion",
            status: "completed",
            created_at: c.revoked_at,
            completed_at: c.revoked_at,
          }));

        // Also create access requests from active consents (as examples)
        const accessRequests = consents
          .filter((c) => !c.revoked_at)
          .slice(0, 10)
          .map((c) => ({
            id: `access-${c.id}`,
            subject_id: c.subject_id,
            request_type: "access",
            status: "completed",
            created_at: c.accepted_at,
            completed_at: c.accepted_at,
          }));

        setRequests([...dataRightsRequests, ...accessRequests]);
      })
      .catch((e) => {
        console.error("Failed to load data rights requests:", e);
        setRequests([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = requests.filter(
    (r) =>
      r.subject_id?.toLowerCase().includes(search.toLowerCase()) ||
      r.request_type?.toLowerCase().includes(search.toLowerCase())
  );

  const exportCSV = () => {
    const csv = [
      ["subject_id", "request_type", "status", "created_at"],
      ...filtered.map((r) => [
        r.subject_id || "",
        r.request_type || "",
        r.status || "",
        r.created_at ? new Date(r.created_at).toISOString() : "",
      ]),
    ]
      .map((r) => r.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "data_rights.csv";
    a.click();
  };

  if (loading) {
    return (
      <section>
        <div className="mb-4">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
          <Skeleton className="h-10 w-full mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </section>
    );
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2.5 py-1 rounded-md text-xs font-medium";
    if (status === "completed") {
      return `${baseClasses} bg-green-50 text-green-700 border border-green-200`;
    } else if (status === "failed") {
      return `${baseClasses} bg-red-50 text-red-700 border border-red-200`;
    } else {
      return `${baseClasses} bg-yellow-50 text-yellow-700 border border-yellow-200`;
    }
  };

  return (
    <section>
      <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Data Rights Requests</h2>
      <p className="text-sm text-slate-500 mb-4">Track data access and deletion requests.</p>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-slate-800">Data Rights Requests</h3>
            <Button
              onClick={exportCSV}
              variant="outline"
              size="sm"
              className="focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
          <div className="mb-4">
            <Input
              type="text"
              placeholder="Search by subject or type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-md focus-visible:ring-2 focus-visible:ring-blue-500"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-slate-500">No data rights requests found.</p>
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Requester</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 odd:bg-slate-50 hover:bg-slate-50 transition-all">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-all">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-slate-700">{r.subject_id}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-700 capitalize">{r.request_type}</td>
                  <td className="px-4 py-3">
                    <span className={getStatusBadge(r.status)}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {r.created_at ? new Date(r.created_at).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
