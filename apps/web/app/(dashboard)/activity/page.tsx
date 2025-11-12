"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface AuditLog {
  id: string;
  action: string;
  user_email: string | null;
  entity_type: string;
  created_at: string;
  metadata_json?: Record<string, any>;
}

export default function ActivityPage() {
  const [events, setEvents] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await apiFetch("/audit?limit=100");
        setEvents(data || []);
      } catch (err: any) {
        setError(err.message || "Failed to load activity");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return timestamp;
    }
  };

  const formatAction = (log: AuditLog) => {
    if (log.metadata_json) {
      const meta = log.metadata_json;
      if (log.action === "created" && log.entity_type === "consent") {
        return `User ${meta.subject_email || "unknown"} granted ${meta.purpose || "consent"}`;
      }
      if (log.action === "revoked" && log.entity_type === "consent") {
        return `User ${meta.subject_email || "unknown"} revoked ${meta.purpose || "consent"}`;
      }
      if (log.action.includes("submitted") && log.entity_type === "data_right_request") {
        return `Data rights request submitted: ${meta.type || "unknown"} for ${meta.subject_email || "unknown"}`;
      }
    }
    return `${log.action} ${log.entity_type}`;
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Loading activity...</p>
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

  if (events.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Activity</h1>
        <p className="text-gray-500">No activity yet.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Activity</h1>
      <div className="border rounded-xl bg-white shadow-sm divide-y">
        {events.map((e) => (
          <div key={e.id} className="px-4 py-3 flex justify-between text-sm text-gray-700">
            <span>
              <span className="font-medium">{e.user_email || "System"}</span> — {formatAction(e)}
            </span>
            <span className="text-gray-400">{formatTimestamp(e.created_at)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
