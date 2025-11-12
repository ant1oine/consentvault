"use client";

import { useEffect, useState, useMemo } from "react";
import { apiFetch } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EventDetailsModal } from "@/components/modals/EventDetailsModal";

interface AuditLog {
  timestamp: string;
  event_type: string;
  actor: string | null;
  details: Record<string, any> | null;
}

interface GroupedLogs {
  date: string;
  label: string;
  logs: AuditLog[];
}

export default function ActivityPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await apiFetch("/audit/logs");
        setLogs(data || []);
      } catch (err: any) {
        setError(err.message || "Failed to load activity");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Format event type: replace underscores with spaces and capitalize words
  const formatEventType = (eventType: string): string => {
    return eventType
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  // Get human-readable action description
  const getActionDescription = (log: AuditLog): string => {
    const eventType = log.event_type.toLowerCase();
    const details = log.details || {};

    // Handle specific event types with better descriptions
    if (eventType.includes("user_assigned") || eventType.includes("user_assigned_to_org")) {
      return "Assigned user to organization";
    }
    if (eventType.includes("user_role_changed") || eventType.includes("role_changed")) {
      return "Changed user role";
    }
    if (eventType.includes("user_created")) {
      return "Created user";
    }
    if (eventType.includes("consent_created") || eventType.includes("consent_granted")) {
      return "Granted consent";
    }
    if (eventType.includes("consent_revoked")) {
      return "Revoked consent";
    }
    if (eventType.includes("data_right") && eventType.includes("submitted")) {
      return "Submitted data rights request";
    }
    if (eventType.includes("export")) {
      return "Exported data";
    }

    // Default: format the event type
    return formatEventType(log.event_type);
  };

  // Get target entity from details
  const getTargetEntity = (log: AuditLog): string => {
    const details = log.details || {};
    
    // Try to extract entity information from details
    if (details.entity_type) {
      return formatEventType(details.entity_type);
    }
    if (details.entity_id) {
      return `Entity ${details.entity_id.slice(0, 8)}`;
    }
    if (details.org_id) {
      return "Organization";
    }
    if (details.user_email) {
      return details.user_email;
    }
    
    // Fallback: try to infer from event_type
    const eventType = log.event_type.toLowerCase();
    if (eventType.includes("consent")) return "Consent";
    if (eventType.includes("user")) return "User";
    if (eventType.includes("org")) return "Organization";
    if (eventType.includes("data_right")) return "Data Rights Request";
    
    return "—";
  };

  // Format timestamp with relative time
  const formatTimestamp = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays}d ago`;

      // For older dates, show formatted date and time
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(date);
    } catch {
      return timestamp;
    }
  };

  // Get badge variant based on event type
  const getBadgeVariant = (eventType: string): "default" | "secondary" | "outline" | "destructive" => {
    const type = eventType.toLowerCase();
    if (type.includes("user") || type.includes("role")) {
      return "secondary";
    }
    if (type.includes("revoked") || type.includes("deleted")) {
      return "destructive";
    }
    if (type.includes("export") || type.includes("sensitive")) {
      return "outline";
    }
    return "default";
  };

  // Group logs by day
  const groupedLogs = useMemo((): GroupedLogs[] => {
    const groups: Map<string, AuditLog[]> = new Map();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    logs.forEach((log) => {
      try {
        const logDate = new Date(log.timestamp);
        logDate.setHours(0, 0, 0, 0);
        const dateKey = logDate.toISOString().split("T")[0];

        if (!groups.has(dateKey)) {
          groups.set(dateKey, []);
        }
        groups.get(dateKey)!.push(log);
      } catch {
        // Skip invalid dates
      }
    });

    return Array.from(groups.entries())
      .map(([dateKey, logs]) => {
        const date = new Date(dateKey);
        let label: string;

        if (date.getTime() === today.getTime()) {
          label = "Today";
        } else if (date.getTime() === yesterday.getTime()) {
          label = "Yesterday";
        } else {
          label = new Intl.DateTimeFormat("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          }).format(date);
        }

        return { date: dateKey, label, logs };
      })
      .sort((a, b) => b.date.localeCompare(a.date)); // Sort newest first
  }, [logs]);

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-slate-500">Loading activity...</p>
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

  if (logs.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Activity</h1>
        <p className="text-slate-500">No activity yet.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Activity</h1>

      {groupedLogs.map((group) => (
        <div key={group.date} className="space-y-3">
          <h2 className="text-sm font-medium text-slate-600 uppercase tracking-wider">
            {group.label}
          </h2>
          
          {/* Desktop Table View */}
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Actor</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead className="text-right">Time</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.logs.map((log, i) => (
                      <TableRow
                        key={`${group.date}-${i}`}
                        className="hover:bg-slate-50/50"
                      >
                        <TableCell className="font-semibold text-slate-900">
                          {log.actor || "System"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getBadgeVariant(log.event_type)}>
                            {getActionDescription(log)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {getTargetEntity(log)}
                        </TableCell>
                        <TableCell className="text-right text-sm text-slate-500">
                          {formatTimestamp(log.timestamp)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedLog(log)}
                            className="text-xs"
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {group.logs.map((log, i) => (
              <Card key={`${group.date}-${i}`} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">
                        {log.actor || "System"}
                      </p>
                      <p className="text-sm text-slate-600 mt-1">
                        {getTargetEntity(log)}
                      </p>
                    </div>
                    <span className="text-xs text-slate-500 ml-2 flex-shrink-0">
                      {formatTimestamp(log.timestamp)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant={getBadgeVariant(log.event_type)}>
                      {getActionDescription(log)}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedLog(log)}
                      className="text-xs"
                    >
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {/* Event Details Modal */}
      <EventDetailsModal
        open={!!selectedLog}
        onOpenChange={(open) => !open && setSelectedLog(null)}
        event={selectedLog}
      />
    </div>
  );
}
