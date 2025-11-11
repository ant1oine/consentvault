"use client";

import { useEffect, useState } from "react";
import { apiFetchAuthed } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download } from "lucide-react";

export default function ApiLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [method, setMethod] = useState("ALL");

  useEffect(() => {
    // Use consents as audit events (showing consent creation/revocation activity)
    apiFetchAuthed("/consents?limit=200")
      .then((consents: any[]) => {
        // Transform consents into audit-like events
        const events = consents.map((c) => ({
          id: c.id,
          created_at: c.accepted_at,
          method: c.revoked_at ? "POST" : "POST",
          endpoint: c.revoked_at ? `/consents/${c.id}/revoke` : "/consents",
          status: c.revoked_at ? 200 : 201,
          subject_id: c.subject_id,
          purpose: c.purpose,
        }));
        setLogs(events);
      })
      .catch((e) => {
        console.error("Failed to load audit events:", e);
        setLogs([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = logs.filter(
    (log) =>
      (method === "ALL" || log.method === method) &&
      (log.endpoint?.toLowerCase().includes(filter.toLowerCase()) ||
        log.status?.toString().includes(filter) ||
        log.subject_id?.toLowerCase().includes(filter.toLowerCase()))
  );

  const exportCSV = () => {
    const csv = [
      ["timestamp", "method", "endpoint", "status", "subject_id"],
      ...filtered.map((l) => [
        l.created_at ? new Date(l.created_at).toISOString() : "",
        l.method || "",
        l.endpoint || "",
        l.status?.toString() || "",
        l.subject_id || "",
      ]),
    ]
      .map((r) => r.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "api_logs.csv";
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

  return (
    <section>
      <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">API Logs</h2>
      <p className="text-sm text-slate-500 mb-4">Monitor inbound and outbound API activities.</p>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-slate-800">API Activity</h3>
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
          <div className="flex gap-3">
            <Input
              type="text"
              placeholder="Search endpoint, status, or subject..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="flex-1 max-w-md focus-visible:ring-2 focus-visible:ring-blue-500"
            />
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="flex h-10 w-[180px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:border-blue-500 hover:border-slate-300 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="ALL">All Methods</option>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-slate-500">No logs found.</p>
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Timestamp</th>
                <th className="px-4 py-3 text-left">Endpoint</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 odd:bg-slate-50 hover:bg-slate-50 transition-all">
              {filtered.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50 transition-all">
                  <td className="px-4 py-3 text-slate-600">
                    {l.created_at ? new Date(l.created_at).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-slate-700">{l.endpoint}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`font-semibold ${
                        l.status >= 400
                          ? "text-red-600"
                          : l.status >= 300
                            ? "text-yellow-600"
                            : "text-green-600"
                      }`}
                    >
                      {l.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">—</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
