"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface Consent {
  id: string;
  subject_email: string | null;
  purpose: string;
  revoked_at: string | null;
  accepted_at: string;
}

export default function ConsentsPage() {
  const [consents, setConsents] = useState<Consent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        // Use legacy endpoint which supports JWT auth (root level, not /v1)
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/v1";
        const apiBase = baseUrl.replace("/v1", ""); // Remove /v1 to access root-level endpoint
        const token =
          typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

        const headers: HeadersInit = {
          "Content-Type": "application/json",
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const res = await fetch(`${apiBase}/consents?limit=100`, { headers });
        if (!res.ok) {
          if (res.status === 401) {
            if (typeof window !== "undefined") {
              localStorage.removeItem("access_token");
              window.dispatchEvent(new CustomEvent("auth-expired"));
            }
            throw new Error("Authentication expired. Please log in again.");
          }
          throw new Error(`API request failed: ${res.status}`);
        }
        const data = await res.json();
        setConsents(data || []);
      } catch (err: any) {
        setError(err.message || "Failed to load consents");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return "Today";
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays} days ago`;
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return timestamp;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Loading consents...</p>
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

  if (consents.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Consents</h1>
        <p className="text-gray-500">No consents available.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Consents</h1>
      <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b text-gray-600">
            <tr>
              <th className="text-left py-3 px-4">User</th>
              <th className="text-left py-3 px-4">Consent Type</th>
              <th className="text-left py-3 px-4">Status</th>
              <th className="text-left py-3 px-4">Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {consents.map((c) => {
              const status = c.revoked_at ? "Revoked" : "Granted";
              const updatedAt = c.revoked_at || c.accepted_at;
              return (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="py-3 px-4">{c.subject_email || "N/A"}</td>
                  <td className="py-3 px-4">{c.purpose}</td>
                  <td
                    className={`py-3 px-4 font-medium ${
                      status === "Granted" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {status}
                  </td>
                  <td className="py-3 px-4 text-gray-500">{formatTimestamp(updatedAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
