"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getConsents, getMe, revokeConsent, getExportCsvUrl, getExportHtmlUrl } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [consents, setConsents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [filters, setFilters] = useState({ subject_id: "", purpose: "", q: "" });

  useEffect(() => {
    const token = localStorage.getItem("cv_token");
    if (!token) {
      router.push("/login");
      return;
    }

    loadData();
  }, []);

  useEffect(() => {
    if (orgId) {
      loadConsents();
    }
  }, [orgId, filters]);

  async function loadData() {
    try {
      const me = await getMe();
      setOrgs(me.orgs || []);
      if (me.orgs && me.orgs.length > 0) {
        const firstOrgId = me.orgs[0].org_id;
        setOrgId(firstOrgId);
        localStorage.setItem("cv_org_id", firstOrgId);
      }
    } catch (err) {
      console.error("Failed to load user data:", err);
      router.push("/login");
    }
  }

  async function loadConsents() {
    if (!orgId) return;
    setLoading(true);
    try {
      const data = await getConsents();
      setConsents(data);
    } catch (err) {
      console.error("Failed to load consents:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke(consentId: string) {
    if (!orgId) return;
    if (!confirm("Are you sure you want to revoke this consent?")) return;
    
    try {
      await revokeConsent(consentId, orgId);
      loadConsents();
    } catch (err) {
      alert("Failed to revoke consent");
    }
  }

  function handleExportCsv() {
    if (!orgId) return;
    window.open(getExportCsvUrl(orgId, filters), "_blank");
  }

  function handleExportHtml() {
    if (!orgId) return;
    window.open(getExportHtmlUrl(orgId, filters), "_blank");
  }

  if (loading && consents.length === 0) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-semibold">Consent Dashboard</h1>
        <div className="flex gap-2">
          <button
            onClick={handleExportCsv}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Export CSV
          </button>
          <button
            onClick={handleExportHtml}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Print/PDF
          </button>
        </div>
      </div>

      {orgs.length > 1 && (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Organization</label>
          <select
            value={orgId || ""}
            onChange={(e) => {
              setOrgId(e.target.value);
              localStorage.setItem("cv_org_id", e.target.value);
            }}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            {orgs.map((org) => (
              <option key={org.org_id} value={org.org_id}>
                {org.org_id}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mb-4 grid grid-cols-3 gap-4">
        <input
          type="text"
          placeholder="Search..."
          value={filters.q}
          onChange={(e) => setFilters({ ...filters, q: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-md"
        />
        <input
          type="text"
          placeholder="Subject ID"
          value={filters.subject_id}
          onChange={(e) => setFilters({ ...filters, subject_id: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-md"
        />
        <input
          type="text"
          placeholder="Purpose"
          value={filters.purpose}
          onChange={(e) => setFilters({ ...filters, purpose: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 text-left border">Subject ID</th>
              <th className="px-4 py-2 text-left border">Purpose</th>
              <th className="px-4 py-2 text-left border">Text</th>
              <th className="px-4 py-2 text-left border">Accepted At</th>
              <th className="px-4 py-2 text-left border">Revoked At</th>
              <th className="px-4 py-2 text-left border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {consents.map((consent) => (
              <tr key={consent.id}>
                <td className="px-4 py-2 border">{consent.subject_id}</td>
                <td className="px-4 py-2 border">{consent.purpose}</td>
                <td className="px-4 py-2 border max-w-xs truncate">{consent.text}</td>
                <td className="px-4 py-2 border">
                  {new Date(consent.accepted_at).toLocaleString()}
                </td>
                <td className="px-4 py-2 border">
                  {consent.revoked_at ? new Date(consent.revoked_at).toLocaleString() : "-"}
                </td>
                <td className="px-4 py-2 border">
                  {!consent.revoked_at && (
                    <button
                      onClick={() => handleRevoke(consent.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
