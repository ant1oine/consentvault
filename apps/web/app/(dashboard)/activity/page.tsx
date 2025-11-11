"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { getAuditLogsSimple } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Activity, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface AuditLog {
  timestamp: string;
  event_type: string;
  actor: string | null;
  details: Record<string, any> | null;
}

// Simple date formatter (human-readable relative time)
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  return date.toLocaleDateString();
}

export default function ActivityPage() {
  const { isSuperadmin } = useAuth();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Superadmin-only access
  if (!isSuperadmin) {
    return (
      <section>
        <div className="rounded-2xl bg-red-50 border border-red-200 shadow-sm p-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-sm text-red-700">
              Access denied. This page is only available to superadmins.
            </p>
          </div>
        </div>
      </section>
    );
  }

  // Use the new simplified endpoint - backend handles filtering by user permissions
  const { data: logs = [], isLoading, error } = useQuery<AuditLog[]>({
    queryKey: ["audit-logs-simple"],
    queryFn: () => getAuditLogsSimple(),
    enabled: true,
  });

  // Get unique event types for filter dropdown
  const eventTypes = Array.from(new Set(logs.map((l) => l.event_type))).sort();

  const filtered = logs.filter((log) => {
    const matchesSearch =
      search === "" ||
      log.event_type?.toLowerCase().includes(search.toLowerCase()) ||
      log.actor?.toLowerCase().includes(search.toLowerCase()) ||
      JSON.stringify(log.details || {}).toLowerCase().includes(search.toLowerCase());

    const matchesFilter = filter === "all" || log.event_type === filter;

    return matchesSearch && matchesFilter;
  });

  const formatEventType = (eventType: string) => {
    const eventMap: Record<string, string> = {
      user_created: "User Created",
      user_promoted: "User Promoted to Superadmin",
      user_role_changed: "User Role Changed",
      org_created: "Organization Created",
      user_assigned_to_org: "User Assigned to Org",
      consent_created: "Consent Created",
      consent_revoked: "Consent Revoked",
      dsar_created: "DSAR Created",
      dsar_completed: "DSAR Completed",
    };
    return (
      eventMap[eventType] ||
      eventType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
    );
  };

  const getEventColor = (eventType: string) => {
    if (eventType.includes("created") || eventType.includes("assigned") || eventType.includes("promoted") || eventType.includes("role_changed")) {
      return "bg-green-50 text-green-700 border-green-200";
    }
    if (eventType.includes("deleted") || eventType.includes("revoked")) {
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
            : "View audit trail of your own actions."}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50">
          <div className="flex flex-wrap gap-3 items-center mb-4">
            <Input
              type="text"
              placeholder="Search by user or event..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 min-w-[200px] max-w-md focus-visible:ring-2 focus-visible:ring-blue-500"
            />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="h-10 px-3 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Events</option>
              {eventTypes.map((type) => (
                <option key={type} value={type}>
                  {formatEventType(type)}
                </option>
              ))}
            </select>
            {(search || filter !== "all") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setFilter("all");
                }}
                className="h-10"
              >
                Clear
              </Button>
            )}
          </div>
          <div className="text-xs text-slate-500">
            Showing {filtered.length} of {logs.length} log entries
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-slate-500">
              {search || filter !== "all"
                ? "No activity logs match your search."
                : "No activity logs found."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-slate-600 uppercase text-xs sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left">Timestamp</th>
                  <th className="px-4 py-3 text-left">Event Type</th>
                  <th className="px-4 py-3 text-left">Actor</th>
                  <th className="px-4 py-3 text-left">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((log, i) => (
                  <tr
                    key={i}
                    className="hover:bg-slate-50 transition-all cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                  >
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {formatTimeAgo(new Date(log.timestamp))}
                      <br />
                      <span className="text-xs text-slate-400">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-1 rounded-md text-xs font-medium border ${getEventColor(
                          log.event_type
                        )}`}
                      >
                        {formatEventType(log.event_type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {log.actor || (
                        <span className="text-slate-400 italic">System</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-blue-600 underline text-xs">
                      {log.details && Object.keys(log.details).length > 0
                        ? "View details"
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Dialog */}
      {selectedLog && (
        <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh]" onClose={() => setSelectedLog(null)}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span>{formatEventType(selectedLog.event_type)}</span>
              </DialogTitle>
              <DialogDescription>
                Performed by <strong>{selectedLog.actor || "System"}</strong>{" "}
                {formatTimeAgo(new Date(selectedLog.timestamp))} (
                {new Date(selectedLog.timestamp).toLocaleString()})
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 max-h-[60vh] overflow-y-auto">
              {selectedLog.details && Object.keys(selectedLog.details).length > 0 ? (
                <pre className="bg-slate-50 p-4 rounded-md text-xs text-slate-800 overflow-x-auto border border-slate-200 whitespace-pre-wrap">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              ) : (
                <p className="text-sm text-slate-500 italic">No additional details available.</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
}
