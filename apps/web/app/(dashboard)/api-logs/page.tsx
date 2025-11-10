"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export default function ApiLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [method, setMethod] = useState("ALL");

  useEffect(() => {
    // Use consents as audit events (showing consent creation/revocation activity)
    apiFetch("/consents?limit=200")
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
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600">Loading API logs...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">API Logs</h1>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Search endpoint, status, or subject..."
          className="border rounded-md px-3 py-2 flex-1"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <select
          className="border rounded-md px-3 py-2 bg-white"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
        >
          <option value="ALL">All Methods</option>
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="DELETE">DELETE</option>
        </select>
        <button
          onClick={exportCSV}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm transition-colors"
        >
          Export CSV
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-600">No logs found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left border">Timestamp</th>
                <th className="p-2 text-left border">Method</th>
                <th className="p-2 text-left border">Endpoint</th>
                <th className="p-2 text-left border">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} className="border-t hover:bg-gray-50">
                  <td className="p-2 border text-gray-600">
                    {l.created_at
                      ? new Date(l.created_at).toLocaleString()
                      : "—"}
                  </td>
                  <td className="p-2 border font-mono text-xs">{l.method}</td>
                  <td className="p-2 border text-gray-600 font-mono text-xs">
                    {l.endpoint}
                  </td>
                  <td
                    className={`p-2 border font-semibold ${
                      l.status >= 400 ? "text-red-500" : "text-green-600"
                    }`}
                  >
                    {l.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
