"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { createOrg } from "@/lib/api";
import { Building2, AlertCircle } from "lucide-react";

export default function CreateOrgPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, refreshUser } = useAuth();
  const [name, setName] = useState("");
  const [region, setRegion] = useState("UAE");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Redirect if already has orgs (unless superadmin)
  useEffect(() => {
    if (!isLoading && user) {
      if (user.orgs && user.orgs.length > 0 && !user.is_superadmin) {
        router.replace("/dashboard");
      }
    }
  }, [isLoading, user, router]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const org = await createOrg({ name, region });
      
      // Refresh user to get updated orgs list
      await refreshUser();
      
      // Wait a bit for state to update
      await new Promise((r) => setTimeout(r, 300));
      
      // Redirect to dashboard
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to create organization. Please try again.");
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-lg p-8 space-y-6">
          <div className="text-center">
            <Building2 className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h1 className="text-2xl font-semibold text-slate-900">Create Organization</h1>
            <p className="text-sm text-slate-500 mt-2">
              Set up your organization to start managing consents
            </p>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">Error</p>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
                Organization Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Corp"
                className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label htmlFor="region" className="block text-sm font-medium text-slate-700 mb-1">
                Region
              </label>
              <select
                id="region"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={isSubmitting}
              >
                <option value="UAE">UAE</option>
                <option value="KSA">KSA</option>
                <option value="Qatar">Qatar</option>
                <option value="Bahrain">Bahrain</option>
                <option value="Kuwait">Kuwait</option>
                <option value="Oman">Oman</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 px-4 rounded-md font-medium transition-colors"
            >
              {isSubmitting ? "Creating..." : "Create Organization"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

