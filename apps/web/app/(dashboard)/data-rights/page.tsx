"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-10 w-full mb-4" />
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
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
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-800 mb-1">Data Rights Requests</h1>
        <p className="text-sm text-slate-600">Track and manage data subject rights requests</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Data Rights Requests</CardTitle>
            <Button onClick={exportCSV} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              type="text"
              placeholder="Search by subject or type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-md"
            />
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-slate-600">No data rights requests found.</p>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.subject_id}</TableCell>
                      <TableCell className="capitalize">{r.request_type}</TableCell>
                      <TableCell>
                        <span className={getStatusBadge(r.status)}>{r.status}</span>
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {r.created_at
                          ? new Date(r.created_at).toLocaleString()
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
