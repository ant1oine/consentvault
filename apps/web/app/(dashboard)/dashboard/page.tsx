"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/providers/AuthProvider";
import { getDashboardSummary, getPlatformOrgs, getPlatformOrgDetails } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Users, FileCheck, X } from "lucide-react";

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="bg-white border rounded-2xl p-4 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="text-2xl font-semibold mt-1">{value.toLocaleString()}</p>
    </div>
  );
}

function OrgDetailsDrawer({
  orgId,
  onClose,
}: {
  orgId: string | null;
  onClose: () => void;
}) {
  const { data: orgDetails, isLoading } = useQuery({
    queryKey: ["platform-org-details", orgId],
    queryFn: () => getPlatformOrgDetails(orgId!),
    enabled: !!orgId,
  });

  if (!orgId) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-end z-50">
      <div className="bg-white w-full max-w-md h-full shadow-lg overflow-y-auto">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">
            {isLoading ? "Loading..." : orgDetails?.name || "Organization Details"}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-md transition-colors"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {isLoading ? (
          <div className="p-6">
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4 mb-4" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : orgDetails ? (
          <div className="p-6 space-y-6">
            <div>
              <p className="text-sm text-slate-500 mb-1">Region</p>
              <p className="text-sm font-medium text-slate-900">{orgDetails.region}</p>
            </div>

            <div>
              <p className="text-sm text-slate-500 mb-1">API Key</p>
              <p className="text-xs text-slate-600 break-all font-mono bg-slate-50 p-2 rounded">
                {orgDetails.api_key}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500 mb-2">Consent Stats</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 p-2 rounded">
                  <p className="text-xs text-slate-500">Active</p>
                  <p className="text-lg font-semibold">{orgDetails.consents_active || 0}</p>
                </div>
                <div className="bg-slate-50 p-2 rounded">
                  <p className="text-xs text-slate-500">Total</p>
                  <p className="text-lg font-semibold">{orgDetails.consents_total || 0}</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm text-slate-500 mb-2">Users ({orgDetails.users?.length || 0})</p>
              <div className="space-y-1">
                {orgDetails.users?.map((user: any) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm"
                  >
                    <span className="text-slate-700">{user.email}</span>
                    <span className="text-xs text-slate-500 bg-white px-2 py-0.5 rounded">
                      {user.role}
                    </span>
                  </div>
                ))}
                {(!orgDetails.users || orgDetails.users.length === 0) && (
                  <p className="text-sm text-slate-400 italic">No users</p>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, isSuperadmin, scope, isLoading: authLoading } = useAuth();
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  // Platform overview for superadmins
  const { data: platformSummary } = useQuery({
    queryKey: ["dashboard-summary", "platform"],
    queryFn: () => getDashboardSummary(),
    enabled: isSuperadmin && scope === "platform",
  });

  const { data: platformOrgs } = useQuery({
    queryKey: ["platform-orgs"],
    queryFn: () => getPlatformOrgs(),
    enabled: isSuperadmin && scope === "platform",
  });

  // Org dashboard for regular users
  const { data: orgSummary, isLoading: orgLoading } = useQuery({
    queryKey: ["dashboard-summary", "org"],
    queryFn: () => getDashboardSummary(),
    enabled: !isSuperadmin && scope === "org" && !!user?.orgs?.[0]?.org_id,
  });

  if (authLoading) {
    return (
      <section>
        <div className="mb-4">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <Skeleton className="h-5 w-5 mb-2" />
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  // Platform Overview for Superadmins
  if (isSuperadmin && scope === "platform") {
    return (
      <section className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Platform Overview</h1>
          <p className="text-sm text-slate-500 mt-1">System-wide visibility for superadmins</p>
        </div>

        {platformSummary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Organizations" value={platformSummary.orgs || 0} />
            <StatCard title="Users" value={platformSummary.users || 0} />
            <StatCard title="Consents" value={platformSummary.consents || 0} />
            <StatCard title="Revocations" value={platformSummary.revocations || 0} />
          </div>
        )}

        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Organizations</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {platformOrgs ? (
              <table className="min-w-full text-sm">
                <thead className="border-b bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Name</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Region</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Users</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Consents</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {platformOrgs.map((org: any) => (
                    <tr key={org.id} className="border-t hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-900">{org.name}</td>
                      <td className="px-4 py-3 text-slate-600">{org.region}</td>
                      <td className="px-4 py-3 text-slate-600">{org.users}</td>
                      <td className="px-4 py-3 text-slate-600">{org.consents}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedOrgId(org.id)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                  {platformOrgs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        No organizations found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-slate-500">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4 mx-auto" />
              </div>
            )}
          </div>
        </div>

        <OrgDetailsDrawer orgId={selectedOrgId} onClose={() => setSelectedOrgId(null)} />
      </section>
    );
  }

  // Org Dashboard for Regular Users
  if (orgLoading) {
    return (
      <section>
        <div className="mb-4">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <Skeleton className="h-5 w-5 mb-2" />
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">
          Organization Dashboard
        </h2>
        <p className="text-sm text-slate-500">
          Monitor consent metrics for your organization
        </p>
      </div>

      {orgSummary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <StatCard title="Consents" value={orgSummary.consents_active || 0} />
          <StatCard title="Revocations" value={orgSummary.revocations || 0} />
          <StatCard title="DSAR Completed" value={orgSummary.dsar_completed || 0} />
          <StatCard title="API Calls" value={orgSummary.consents_active || 0} />
        </div>
      )}
    </section>
  );
}
