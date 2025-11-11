"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { getAuditLogs } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Activity } from "lucide-react";

interface AuditLog {
  id: string;
  org_id: string | null;
  user_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata_json: Record<string, any> | null;
  created_at: string;
}

export default function ActivityPage() {
  const { activeOrgId, user } = useAuth();
  const [search, setSearch] = useState("");

  // Superadmins can see all logs, regular users see only their org's logs
  const { data: logs = [], isLoading, error } = useQuery<AuditLog[]>({
    queryKey: queryKeys.auditLogsByOrg(activeOrgId || undefined),
    queryFn: () => getAuditLogs(activeOrgId || undefined),
    enabled: true, // Always enabled, backend handles filtering
  });

  const filtered = logs.filter(
    (log) =>
      log.action?.toLowerCase().includes(search.toLowerCase()) ||
      log.entity_type?.toLowerCase().includes(search.toLowerCase()) ||
      log.user_email?.toLowerCase().includes(search.toLowerCase()) ||
      JSON.stringify(log.metadata_json || {}).toLowerCase().includes(search.toLowerCase())
  );

  const formatAction = (action: string, entityType: string) => {
    const actionMap: Record<string, string> = {
      created: "Created",
      updated: "Updated",
      deleted: "Deleted",
      revoked: "Revoked",
      added_user: "Added User",
    };
    return `${actionMap[action] || action} ${entityType}`;
  };

  const getActionColor = (action: string) => {
    if (action === "created" || action === "added_user") {
      return "bg-green-50 text-green-700 border-green-200";
    }
    if (action === "deleted" || action === "revoked") {
      return "bg-red-50 text-red-700 border-red-200";
    }
    return "bg-blue-50 text-blue-700 border-blue-200";
  };

  if (isLoading) {
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

  if (error) {
    return (
      <section>
        <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Activity Log</h2>
        <p className="text-sm text-slate-500 mb-4">View audit trail of all platform actions.</p>
        <div className="rounded-2xl bg-red-50 border border-red-200 shadow-sm p-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-sm text-red-700">
              Failed to load activity logs. Please try again later.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-2xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
          <Activity className="h-6 w-6" />
          Activity Log
        </h2>
        <p className="text-sm text-slate-500">
          {user?.is_superadmin
            ? "View audit trail of all platform actions across all organizations."
            : "View audit trail of actions in your organization."}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50">
          <div className="mb-4">
            <Input
              type="text"
              placeholder="Search by action, entity type, user email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-md focus-visible:ring-2 focus-visible:ring-blue-500"
            />
          </div>
          <div className="text-xs text-slate-500">
            Showing {filtered.length} of {logs.length} log entries
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-slate-500">
              {search ? "No activity logs match your search." : "No activity logs found."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Time</th>
                  <th className="px-4 py-3 text-left">Action</th>
                  <th className="px-4 py-3 text-left">User</th>
                  <th className="px-4 py-3 text-left">Entity</th>
                  <th className="px-4 py-3 text-left">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-all">
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-1 rounded-md text-xs font-medium border ${getActionColor(
                          log.action
                        )}`}
                      >
                        {formatAction(log.action, log.entity_type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {log.user_email || (
                        <span className="text-slate-400 italic">System</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <span className="font-mono text-xs">{log.entity_type}</span>
                      {log.entity_id && (
                        <span className="text-slate-400 ml-1">
                          ({log.entity_id.substring(0, 8)}...)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {log.metadata_json && Object.keys(log.metadata_json).length > 0 ? (
                        <details className="cursor-pointer">
                          <summary className="text-xs text-blue-600 hover:text-blue-700">
                            View details
                          </summary>
                          <pre className="mt-2 text-xs bg-slate-50 p-2 rounded border border-slate-200 overflow-x-auto">
                            {JSON.stringify(log.metadata_json, null, 2)}
                          </pre>
                        </details>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

