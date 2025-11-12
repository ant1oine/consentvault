"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  user_email: string | null;
  created_at: string;
  metadata_json?: Record<string, any>;
}

export default function ApiLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await apiFetch("/audit?limit=100");
        setLogs(data || []);
      } catch (err: any) {
        setError(err.message || "Failed to load API logs");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return timestamp;
    }
  };

  const getEndpoint = (log: AuditLog) => {
    if (log.entity_type === "consent") return `/v1/consents`;
    if (log.entity_type === "data_right_request") return `/v1/data-rights`;
    return `/v1/${log.entity_type}`;
  };

  const getMethod = (log: AuditLog) => {
    if (log.action.includes("created") || log.action.includes("submitted")) return "POST";
    if (log.action.includes("revoked") || log.action.includes("marked")) return "POST";
    return "GET";
  };

  const getStatus = (log: AuditLog) => {
    if (log.action.includes("created") || log.action.includes("submitted")) return 201;
    if (log.action.includes("revoked") || log.action.includes("marked")) return 200;
    return 200;
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Loading API logs...</p>
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
        <h1 className="text-2xl font-bold mb-4">API Logs</h1>
        <p className="text-gray-500">No API logs found.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">API Logs</h1>
      <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b text-gray-600">
            <tr>
              <th className="text-left py-3 px-4">Endpoint</th>
              <th className="text-left py-3 px-4">Method</th>
              <th className="text-left py-3 px-4">Status</th>
              <th className="text-left py-3 px-4">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => {
              const status = getStatus(log);
              return (
                <tr key={log.id} className="border-b last:border-0">
                  <td className="py-3 px-4 font-mono">{getEndpoint(log)}</td>
                  <td className="py-3 px-4">{getMethod(log)}</td>
                  <td
                    className={`py-3 px-4 ${
                      status >= 400 ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {status}
                  </td>
                  <td className="py-3 px-4 text-gray-500">{formatTimestamp(log.created_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
