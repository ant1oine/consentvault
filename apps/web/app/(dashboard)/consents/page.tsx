"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download } from "lucide-react";

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
      <div className="mb-4">
        <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Consents</h2>
        <p className="text-sm text-slate-500">View and manage user consent records.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-slate-800">Consent Records</h3>
            <Button onClick={exportCSV} variant="outline" size="sm" className="focus-visible:ring-2 focus-visible:ring-blue-500">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
          <div className="mb-4">
            <Input
              type="text"
              placeholder="Search by subject or purpose..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-md focus-visible:ring-2 focus-visible:ring-blue-500"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-slate-500">No consent records found.</p>
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">Policy</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c, index) => (
                <tr
                  key={c.id}
                  className={`transition-colors hover:bg-slate-50 ${
                    index % 2 === 1 ? "bg-slate-50" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-slate-700">{c.subject_id}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{c.purpose}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                        c.revoked_at
                          ? "bg-red-50 text-red-700 border border-red-200"
                          : "bg-green-50 text-green-700 border border-green-200"
                      }`}
                    >
                      {c.revoked_at ? "Revoked" : "Active"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {c.revoked_at
                      ? new Date(c.revoked_at).toLocaleString()
                      : c.accepted_at
                      ? new Date(c.accepted_at).toLocaleString()
                      : "—"}
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
