"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface DataRightRequest {
  id: string;
  request_type: string;
  status: string;
  subject_email: string;
  created_at: string;
}

export default function DataRightsPage() {
  const [rights, setRights] = useState<DataRightRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await apiFetch("/data-rights");
        setRights(data || []);
      } catch (err: any) {
        setError(err.message || "Failed to load data rights requests");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return timestamp;
    }
  };

  const formatRequestId = (id: string) => {
    return `#${id.slice(0, 8)}`;
  };

  const formatRequestType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Loading data rights requests...</p>
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

  if (rights.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Data Rights Requests</h1>
        <p className="text-gray-500">No data rights requests found.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Data Rights Requests</h1>
      <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b text-gray-600">
            <tr>
              <th className="text-left py-3 px-4">Request ID</th>
              <th className="text-left py-3 px-4">Type</th>
              <th className="text-left py-3 px-4">Status</th>
              <th className="text-left py-3 px-4">Requester</th>
              <th className="text-left py-3 px-4">Date</th>
            </tr>
          </thead>
          <tbody>
            {rights.map((r) => {
              const statusColor =
                r.status === "completed"
                  ? "text-green-600"
                  : r.status === "pending"
                  ? "text-yellow-600"
                  : "text-blue-600";
              return (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="py-3 px-4">{formatRequestId(r.id)}</td>
                  <td className="py-3 px-4">{formatRequestType(r.request_type)}</td>
                  <td className={`py-3 px-4 ${statusColor}`}>
                    {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                  </td>
                  <td className="py-3 px-4">{r.subject_email}</td>
                  <td className="py-3 px-4 text-gray-500">{formatTimestamp(r.created_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
