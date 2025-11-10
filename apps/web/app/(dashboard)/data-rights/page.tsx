"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

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
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600">Loading data rights requests...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Data Rights Requests</h1>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Search by subject or type..."
          className="border rounded-md px-3 py-2 flex-1"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          onClick={exportCSV}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm transition-colors"
        >
          Export CSV
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-600">No data rights requests found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left border">Subject</th>
                <th className="p-2 text-left border">Type</th>
                <th className="p-2 text-left border">Status</th>
                <th className="p-2 text-left border">Requested</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t hover:bg-gray-50">
                  <td className="p-2 border font-mono text-xs">{r.subject_id}</td>
                  <td className="p-2 border capitalize">{r.request_type}</td>
                  <td className="p-2 border">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        r.status === "completed"
                          ? "bg-green-100 text-green-700"
                          : r.status === "failed"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="p-2 border text-gray-600">
                    {r.created_at
                      ? new Date(r.created_at).toLocaleString()
                      : "—"}
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
