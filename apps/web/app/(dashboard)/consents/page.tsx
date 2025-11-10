"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export default function ConsentsPage() {
  const [consents, setConsents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    apiFetch("/consents?limit=200")
      .then((data: any[]) => {
        setConsents(data);
      })
      .catch((e) => {
        console.error("Failed to load consents:", e);
        setConsents([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = consents.filter(
    (c) =>
      c.subject_id?.toLowerCase().includes(search.toLowerCase()) ||
      c.purpose?.toLowerCase().includes(search.toLowerCase())
  );

  const exportCSV = () => {
    const csv = [
      ["subject_id", "purpose", "accepted_at", "revoked_at"],
      ...filtered.map((c) => [
        c.subject_id || "",
        c.purpose || "",
        c.accepted_at ? new Date(c.accepted_at).toISOString() : "",
        c.revoked_at ? new Date(c.revoked_at).toISOString() : "",
      ]),
    ]
      .map((r) => r.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "consents.csv";
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600">Loading consents...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Consents</h1>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Search by subject or purpose..."
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
        <p className="text-gray-600">No consent records found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left border">Subject</th>
                <th className="p-2 text-left border">Purpose</th>
                <th className="p-2 text-left border">Accepted</th>
                <th className="p-2 text-left border">Revoked</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t hover:bg-gray-50">
                  <td className="p-2 border font-mono text-xs">{c.subject_id}</td>
                  <td className="p-2 border">{c.purpose}</td>
                  <td className="p-2 border text-gray-600">
                    {c.accepted_at
                      ? new Date(c.accepted_at).toLocaleString()
                      : "—"}
                  </td>
                  <td className="p-2 border text-gray-600">
                    {c.revoked_at ? new Date(c.revoked_at).toLocaleString() : "—"}
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
