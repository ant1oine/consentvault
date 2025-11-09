"use client";

import { useEffect, useState, useTransition } from "react";
import { useAuth } from "@/components/providers/AuthContext";
import { getAllOrganizations, Organization } from "@/lib/api";
import { Select } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "sonner";
import { trackUIEvent } from "@/lib/analytics";

export function OrgSwitcher() {
  const { org, setOrg, apiKey } = useAuth();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSuperAdminUser, setIsSuperAdminUser] = useState<boolean | null>(null);
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();

  useEffect(() => {
    async function loadOrgs() {
      if (!apiKey) {
        setIsSuperAdminUser(false);
        return;
      }

      setLoading(true);
      try {
        const data = await getAllOrganizations();
        setOrgs(data);
        
        // If we get more than 1 org, this is a superadmin key
        const isSuperAdmin = data.length > 1;
        setIsSuperAdminUser(isSuperAdmin);
        // Store this in localStorage for future reference
        localStorage.setItem("cv_is_superadmin", isSuperAdmin ? "true" : "false");
      } catch (e) {
        console.error("Failed to load orgs", e);
        // If the call fails, they're probably not a superadmin
        setIsSuperAdminUser(false);
        localStorage.setItem("cv_is_superadmin", "false");
        toast.error("Failed to load organizations");
      } finally {
        setLoading(false);
      }
    }

    // Check cached flag first for immediate UI update
    const cached = localStorage.getItem("cv_is_superadmin");
    if (cached === "false") {
      setIsSuperAdminUser(false);
      return;
    }
    if (cached === "true") {
      setIsSuperAdminUser(true);
    }
    
    void loadOrgs();
  }, [apiKey]);

  // Don't render until we've determined superadmin status
  if (isSuperAdminUser === null || !isSuperAdminUser) return null;

  const invalidateOrgScopedQueries = () => {
    const scopedKeys = [
      queryKeys.consents({ limit: 100 }),
      queryKeys.consents({ limit: 1000 }),
      queryKeys.rights(),
      queryKeys.users(),
      queryKeys.purposes(),
      queryKeys.policies(),
      queryKeys.webhooks(),
      queryKeys.auditLogs(),
    ];
    scopedKeys.forEach((key) =>
      queryClient.invalidateQueries({ queryKey: key })
    );
  };

  const handleOrgChange = (orgId: string) => {
    startTransition(() => {
      if (orgId === "") {
        // "All" option - clear org selection
        setOrg(null);
        localStorage.removeItem("cv_org");
        invalidateOrgScopedQueries();
        trackUIEvent("org_switch", { org: "all" });
        toast.success("Viewing all organizations");
        return;
      }

      const selected = orgs.find((o) => o.id === Number(orgId));
      if (selected) {
        const orgData = { id: selected.id, name: selected.name };
        setOrg(orgData);
        localStorage.setItem("cv_org", JSON.stringify(orgData));
        invalidateOrgScopedQueries();
        trackUIEvent("org_switch", { org: selected.name, org_id: selected.id });
        toast.success(`Switched to ${selected.name}`);
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-muted-foreground">Org:</label>
      <Select
        className="min-w-[200px]"
        value={org?.id?.toString() || ""}
        onChange={(e) => handleOrgChange(e.target.value)}
        disabled={loading || orgs.length === 0 || isPending}
      >
        <option value="">All</option>
        {orgs.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </Select>
      {loading && (
        <span className="text-xs text-muted-foreground">Loading...</span>
      )}
      {isPending && (
        <span className="text-xs text-muted-foreground animate-spin">⟳</span>
      )}
    </div>
  );
}

