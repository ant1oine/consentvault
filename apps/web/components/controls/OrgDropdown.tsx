"use client";

import { useState } from "react";
import { Building2 } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export function OrgDropdown() {
  const { user, activeOrgId, setActiveOrgId } = useAuth();
  const orgIndex =
    user?.orgs?.findIndex((org) => org.org_id === activeOrgId) ?? 0;
  const orgName = user?.orgs?.[orgIndex]
    ? `${user.orgs[orgIndex].role === "admin" ? "Admin" : "Member"} Org ${orgIndex + 1}`
    : "Admin Org 1";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        showChevron={false}
        className="flex items-center gap-2 border border-slate-200 rounded-md px-3 h-9 text-sm text-slate-700 hover:bg-slate-50"
      >
        <Building2 className="h-4 w-4 text-blue-600" />
        {orgName} ▾
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {user?.orgs?.map((org, i) => (
          <DropdownMenuItem
            key={org.org_id}
            onClick={() => setActiveOrgId(org.org_id)}
          >
            {org.role === "admin" ? "Admin" : "Member"} Org {i + 1}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

