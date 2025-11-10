"use client";

import { useAuth } from "@/components/providers/AuthProvider";

export default function OrgSwitcher() {
  const { user, activeOrgId, setActiveOrgId, isLoading } = useAuth();

  if (isLoading) {
    return <div className="text-sm text-gray-400">Loading orgs...</div>;
  }

  if (!user?.orgs || user.orgs.length === 0) {
    return <div className="text-sm text-gray-400">No organizations</div>;
  }

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setActiveOrgId(e.target.value);
  };

  return (
    <select
      value={activeOrgId || ""}
      onChange={handleChange}
      className="border rounded-md px-2 py-1 text-sm bg-white"
    >
      {user.orgs.map((org, i) => (
        <option key={org.org_id} value={org.org_id}>
          {org.role === "admin" ? "Admin" : "Member"} Org {i + 1}
        </option>
      ))}
    </select>
  );
}

