"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { API_URL } from "@/lib/api";

interface Org {
  id: string;
  name: string;
  created_at?: string;
}

interface Consent {
  id: string;
  subject_id: string;
  purpose: string;
  text?: string;
  accepted_at?: string;
  revoked_at?: string | null;
  status?: string;
}

export default function DashboardPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [consents, setConsents] = useState<Consent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiUrl] = useState(
    process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"
  );

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Try to fetch organizations - note: this endpoint may require auth
      const orgRes = await fetch(`${apiUrl}/orgs`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      let orgData: Org[] = [];
      if (orgRes.ok) {
        orgData = await orgRes.json();
        // Handle both array and single object responses
        if (!Array.isArray(orgData)) {
          orgData = [orgData];
        }
      } else if (orgRes.status === 401 || orgRes.status === 403) {
        setError("Authentication required. Please log in to view data.");
      } else {
        console.warn("Failed to fetch orgs:", orgRes.status);
      }

      // Try to fetch consents - note: this endpoint requires org_id and auth
      const consRes = await fetch(`${apiUrl}/consents`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      let consData: Consent[] = [];
      if (consRes.ok) {
        consData = await consRes.json();
        // Handle both array and single object responses
        if (!Array.isArray(consData)) {
          consData = [consData];
        }
        // Add status field based on revoked_at
        consData = consData.map((c: Consent) => ({
          ...c,
          status: c.revoked_at ? "Revoked" : "Active",
        }));
      } else if (consRes.status === 401 || consRes.status === 403) {
        // Auth error already handled above
      } else if (consRes.status === 400) {
        // Missing org_id parameter
        console.warn("Consents endpoint requires org_id parameter");
      } else {
        console.warn("Failed to fetch consents:", consRes.status);
      }

      setOrgs(orgData);
      setConsents(consData);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(
        err instanceof Error
          ? `Connection error: ${err.message}`
          : "Failed to connect to backend API. Is it running at " + apiUrl + "?"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [apiUrl]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <Skeleton className="h-8 w-48 mx-auto" />
              <p className="text-gray-500">Loading dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 space-y-10">
      {error && (
        <div className="max-w-6xl mx-auto">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-800">{error}</p>
              <p className="text-sm text-red-600 mt-2">
                API URL: {apiUrl}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="max-w-6xl mx-auto shadow-lg border border-gray-200 bg-white/60 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-900 flex justify-between items-center">
            Organizations
            <Button size="sm" onClick={fetchData} disabled={loading}>
              {loading ? "Loading..." : "Refresh"}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {orgs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orgs.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell className="font-mono text-sm">
                      {org.id}
                    </TableCell>
                    <TableCell className="font-medium">{org.name}</TableCell>
                    <TableCell className="text-gray-500">
                      {org.created_at
                        ? new Date(org.created_at).toLocaleDateString()
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-gray-400">
              {error
                ? "Unable to load organizations"
                : "No organizations found"}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="max-w-6xl mx-auto shadow-lg border border-gray-200 bg-white/60 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-900 flex justify-between items-center">
            Consents
            <Button size="sm" onClick={fetchData} disabled={loading}>
              {loading ? "Loading..." : "Refresh"}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {consents.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Subject ID</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Accepted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {consents.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-sm">
                      {c.id.substring(0, 8)}...
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {c.subject_id}
                    </TableCell>
                    <TableCell>{c.purpose}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          c.status === "Active"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {c.status || "Active"}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {c.accepted_at
                        ? new Date(c.accepted_at).toLocaleDateString()
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-gray-400">
              {error
                ? "Unable to load consents (may require authentication and org_id)"
                : "No consents found"}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

