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
        className="flex items-center justify-center p-1.5 text-slate-700 hover:text-slate-900 transition-colors"
      >
        <Building2 className="h-5 w-5 text-blue-600" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="right-0 left-auto min-w-[180px]">
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

