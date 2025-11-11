"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { Building2 } from "lucide-react";

export default function OrgSwitcher() {
  const { user, activeOrgId, setActiveOrgId, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400">
        <Building2 className="h-4 w-4" />
        <span>Loading...</span>
      </div>
    );
  }

  if (!user?.orgs || user.orgs.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400">
        <Building2 className="h-4 w-4" />
        <span>No organizations</span>
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setActiveOrgId(e.target.value);
  };

  return (
    <div className="flex items-center gap-2 text-sm text-slate-600">
      <Building2 className="h-4 w-4 text-blue-600" />
      <select
        value={activeOrgId || ""}
        onChange={handleChange}
        className="border-0 bg-transparent text-sm text-slate-600 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded transition-all cursor-pointer"
      >
        {user.orgs.map((org, i) => (
          <option key={org.org_id} value={org.org_id}>
            {org.role === "admin" ? "Admin" : "Member"} Org {i + 1}
          </option>
        ))}
      </select>
    </div>
  );
}

