"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { getDataRights, updateDataRightStatus } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ShieldCheck, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DataRightRequest {
  id: string;
  org_id: string;
  subject_email: string;
  request_type: "access" | "rectify" | "erase";
  status: "pending" | "processing" | "completed" | "rejected";
  notes: string | null;
  processed_by: string | null;
  created_at: string;
  updated_at: string | null;
}

export default function DataRightsPage() {
  const { activeOrgId, user } = useAuth();
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  // Superadmins can see all requests, regular users see only their org's requests
  const { data: requests = [], isLoading, error } = useQuery<DataRightRequest[]>({
    queryKey: queryKeys.dataRights(activeOrgId || undefined),
    queryFn: () => getDataRights(activeOrgId || undefined),
    enabled: true, // Always enabled, backend handles filtering
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ requestId, status }: { requestId: string; status: "processing" | "completed" | "rejected" }) =>
      updateDataRightStatus(requestId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dataRights(activeOrgId || undefined) });
    },
  });

  const filtered = requests.filter(
    (req) =>
      req.subject_email?.toLowerCase().includes(search.toLowerCase()) ||
      req.request_type?.toLowerCase().includes(search.toLowerCase()) ||
      req.status?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "processing":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "completed":
        return "bg-green-50 text-green-700 border-green-200";
      case "rejected":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const getRequestTypeLabel = (type: string) => {
    switch (type) {
      case "access":
        return "Access Data";
      case "rectify":
        return "Rectify Data";
      case "erase":
        return "Erase Data";
      default:
        return type;
    }
  };

  const handleStatusUpdate = (requestId: string, status: "processing" | "completed" | "rejected") => {
    if (confirm(`Are you sure you want to mark this request as ${status}?`)) {
      updateStatusMutation.mutate({ requestId, status });
    }
  };

  if (isLoading) {
    return (
      <section>
        <div className="mb-4">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
          <Skeleton className="h-10 w-full mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section>
        <h2 className="text-2xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
          <ShieldCheck className="h-6 w-6" />
          Data Rights Requests
        </h2>
        <p className="text-sm text-slate-500 mb-4">Manage Data Subject Access Requests (DSAR).</p>
        <div className="rounded-2xl bg-red-50 border border-red-200 shadow-sm p-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-sm text-red-700">
              Failed to load data rights requests. Please try again later.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-2xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
          <ShieldCheck className="h-6 w-6" />
          Data Rights Requests
        </h2>
        <p className="text-sm text-slate-500">
          {user?.is_superadmin
            ? "Manage Data Subject Access Requests (DSAR) across all organizations."
            : "Manage Data Subject Access Requests (DSAR) for your organization."}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50">
          <div className="mb-4">
            <Input
              type="text"
              placeholder="Search by email, type, or status..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-md focus-visible:ring-2 focus-visible:ring-blue-500"
            />
          </div>
          <div className="text-xs text-slate-500">
            Showing {filtered.length} of {requests.length} requests
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-slate-500">
              {search ? "No requests match your search." : "No data rights requests found."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Created</th>
                  <th className="px-4 py-3 text-left">Processed By</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50 transition-all">
                    <td className="px-4 py-3 text-slate-700">{req.subject_email}</td>
                    <td className="px-4 py-3 text-slate-700">{getRequestTypeLabel(req.request_type)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-1 rounded-md text-xs font-medium border ${getStatusColor(
                          req.status
                        )}`}
                      >
                        {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {new Date(req.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {req.processed_by || <span className="text-slate-400 italic">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {req.status === "pending" || req.status === "processing" ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger className="p-1 hover:bg-slate-100 rounded">
                            <MoreVertical className="h-4 w-4 text-slate-600" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            {req.status === "pending" && (
                              <DropdownMenuItem
                                onClick={() => handleStatusUpdate(req.id, "processing")}
                              >
                                Mark as Processing
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => handleStatusUpdate(req.id, "completed")}
                            >
                              Mark as Completed
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleStatusUpdate(req.id, "rejected")}
                              className="text-red-600"
                            >
                              Reject
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
