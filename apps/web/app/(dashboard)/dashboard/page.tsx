"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Card, CardContent } from "@/components/ui/card";
import { X } from "lucide-react";

interface DashboardStats {
  scope?: string;
  org?: string;
  orgs?: number;
  users?: number;
  consents?: number;
  consents_active?: number;
  revocations?: number;
  dsar_completed?: number;
  api_logs?: number;
  data_rights?: number;
  activity?: number;
  is_superadmin?: boolean;
}

interface AuditLog {
  id: string;
  action: string;
  user_email: string | null;
  entity_type: string;
  created_at: string;
  metadata_json?: Record<string, any>;
}

interface Org {
  id: string;
  name: string;
  region: string;
  users: number;
  consents: number;
  api_logs: number;
  data_rights: number;
  created_at: string | null;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recent, setRecent] = useState<AuditLog[]>([]);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedOrg, setSelectedOrg] = useState<Org | null>(null);
  const [details, setDetails] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const summary = await apiFetch("/dashboard/summary");
        setStats(summary);

        // If user is superadmin, also load orgs
        if (summary.is_superadmin) {
          const orgData = await apiFetch("/dashboard/orgs");
          setOrgs(orgData);
        } else {
          // For regular users, load recent activity
          const recentActivity = await apiFetch("/audit?limit=10");
          setRecent(recentActivity || []);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedOrg) return;

    apiFetch(`/orgs/${selectedOrg.id}/details`)
      .then(setDetails)
      .catch(() => setDetails(null));
  }, [selectedOrg]);

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-red-600">Error: {error}</p>
      </div>
    );
  }

  const isSuperAdmin = stats?.is_superadmin;

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard label="API Logs" value={stats?.api_logs ?? 0} />
        <MetricCard label="Consents" value={stats?.consents ?? 0} />
        <MetricCard label="Data Rights" value={stats?.data_rights ?? 0} />
        <MetricCard label="Activity" value={stats?.activity ?? 0} />
      </div>

      {isSuperAdmin ? (
        <div className="mt-10">
          <h2 className="text-lg font-semibold mb-3">Organizations</h2>
          <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b text-gray-600">
                <tr>
                  <th className="py-2 px-4 text-left">Organization</th>
                  <th className="py-2 px-4 text-left">Region</th>
                  <th className="py-2 px-4 text-left">Users</th>
                  <th className="py-2 px-4 text-left">Consents</th>
                  <th className="py-2 px-4 text-left">API Logs</th>
                  <th className="py-2 px-4 text-left">Data Rights</th>
                  <th className="py-2 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orgs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-4 px-4 text-center text-gray-500">
                      No organizations found
                    </td>
                  </tr>
                ) : (
                  orgs.map((org) => (
                    <tr
                      key={org.id}
                      className="border-b hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-2 px-4 font-medium">{org.name}</td>
                      <td className="py-2 px-4">{org.region}</td>
                      <td className="py-2 px-4">{org.users}</td>
                      <td className="py-2 px-4">{org.consents}</td>
                      <td className="py-2 px-4">{org.api_logs}</td>
                      <td className="py-2 px-4">{org.data_rights}</td>
                      <td className="py-2 px-4 text-right">
                        <button
                          className="text-blue-600 hover:underline"
                          onClick={() => setSelectedOrg(org)}
                        >
                          View →
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Drawer open={!!selectedOrg} onOpenChange={(open) => { 
            if (!open) {
              setSelectedOrg(null);
              setDetails(null);
            }
          }}>
            <DrawerContent>
              <DrawerHeader>
                <div className="flex items-center justify-between">
                  <DrawerTitle>{details?.name || "Organization Details"}</DrawerTitle>
                  <button
                    onClick={() => {
                      setSelectedOrg(null);
                      setDetails(null);
                    }}
                    className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                  </button>
                </div>
              </DrawerHeader>

              {details ? (
                <div className="p-4 space-y-4 overflow-y-auto h-full">
                  <Card>
                    <CardContent className="space-y-2 p-4">
                      <p><span className="font-semibold">Region:</span> {details.region}</p>
                      <p><span className="font-semibold">Created:</span> {new Date(details.created_at).toLocaleDateString()}</p>
                      <p><span className="font-semibold">Total Users:</span> {details.users?.length || 0}</p>
                      <p><span className="font-semibold">Consents:</span> {details.consent_count || 0}</p>
                      <p><span className="font-semibold">DSARs:</span> {details.dsar_count || 0}</p>
                    </CardContent>
                  </Card>

                  {details.users && details.users.length > 0 && (
                    <Card>
                      <CardContent className="p-4">
                        <h2 className="font-semibold mb-2">Users</h2>
                        <ul className="space-y-1">
                          {details.users.map((u: any) => (
                            <li key={u.email} className="text-sm">
                              {u.email} <span className="text-gray-500">({u.role})</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <div className="p-4 text-gray-500">Loading details...</div>
              )}
            </DrawerContent>
          </Drawer>
        </div>
      ) : (
        <div>
          <h2 className="text-lg font-semibold mb-3">Recent Activity</h2>
          <div className="border rounded-xl bg-white shadow-sm divide-y">
            {recent.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500">No recent activity</div>
            ) : (
              recent.map((r) => (
                <div key={r.id} className="px-4 py-3 flex justify-between text-sm text-gray-700">
                  <span>{formatAction(r)}</span>
                  <span className="text-gray-400">{formatTimestamp(r.created_at)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatTimestamp(timestamp: string) {
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return timestamp;
  }
}

function formatAction(log: AuditLog) {
  if (log.metadata_json) {
    const meta = log.metadata_json;
    if (log.action === "created" && log.entity_type === "consent") {
      return `User ${meta.subject_email || "unknown"} granted ${meta.purpose || "consent"}`;
    }
    if (log.action === "revoked" && log.entity_type === "consent") {
      return `User ${meta.subject_email || "unknown"} revoked ${meta.purpose || "consent"}`;
    }
  }
  return `${log.user_email || "System"} — ${log.action} ${log.entity_type}`;
}

function MetricCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="border rounded-xl p-4 bg-white shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}
