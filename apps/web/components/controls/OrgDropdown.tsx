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
  const { user, activeOrgId, setActiveOrgId, isSuperadmin } = useAuth();
  
  // Superadmins don't have orgs and can't switch - hide the dropdown
  if (isSuperadmin || !user?.orgs || user.orgs.length === 0) {
    return null;
  }

  const orgIndex =
    user?.orgs?.findIndex((org) => org.org_id === activeOrgId || org.id === activeOrgId) ?? 0;
  const orgName = user?.orgs?.[orgIndex]?.name || `Org ${orgIndex + 1}`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        showChevron={false}
        className="flex items-center justify-center p-1.5 text-slate-700 hover:text-slate-900 transition-colors"
      >
        <Building2 className="h-5 w-5 text-blue-600" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="right-0 left-auto min-w-[180px]">
        {user.orgs.map((org) => {
          const orgId = org.org_id || org.id;
          const isActive = orgId === activeOrgId;
          return (
            <DropdownMenuItem
              key={orgId}
              onClick={() => orgId && setActiveOrgId(orgId)}
              className={isActive ? "bg-slate-100 font-medium" : ""}
            >
              {org.name || `Org ${org.role}`}
              {org.role && <span className="ml-2 text-xs text-slate-500">({org.role})</span>}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

