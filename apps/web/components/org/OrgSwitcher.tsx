"use client";

import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";

export default function OrgSwitcher() {
  const [orgs, setOrgs] = useState<{ org_id: string; role: string }[]>([]);
  const [activeOrg, setActiveOrg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrgs() {
      try {
        const me = await apiFetch("/auth/me");
        setOrgs(me.orgs || []);
        const stored = localStorage.getItem("active_org_id");
        if (stored) setActiveOrg(stored);
        else if (me.orgs?.length > 0) {
          const first = me.orgs[0].org_id;
          setActiveOrg(first);
          localStorage.setItem("active_org_id", first);
        }
      } catch (err) {
        console.error("❌ Failed to load orgs:", err);
      } finally {
        setLoading(false);
      }
    }
    loadOrgs();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newOrgId = e.target.value;
    setActiveOrg(newOrgId);
    localStorage.setItem("active_org_id", newOrgId);
    // Optional: refresh to reload data in context
    window.location.reload();
  };

  if (loading) return <div className="text-sm text-gray-400">Loading orgs...</div>;
  if (!orgs.length) return <div className="text-sm text-gray-400">No organizations</div>;

  return (
    <select
      value={activeOrg || ""}
      onChange={handleChange}
      className="px-3 py-2 rounded-xl bg-white/80 backdrop-blur-sm border border-gray-300 text-gray-800 hover:bg-white/90 transition"
    >
      {orgs.map((org, i) => (
        <option key={org.org_id} value={org.org_id}>
          {org.role === "admin" ? "Admin" : "Member"} Org {i + 1}
        </option>
      ))}
    </select>
  );
}

