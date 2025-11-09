"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { trackUIEvent } from "@/lib/analytics";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function LoginPage() {
  const { setApiKey, setOrg, apiKey } = useAuth();
  const router = useRouter();
  const [key, setKey] = useState("");
  const [orgId, setOrgId] = useState("");
  const [orgName, setOrgName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Redirect if already logged in
  useEffect(() => {
    if (apiKey) {
      router.push("/");
    }
  }, [apiKey, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!key.trim()) {
      setError("Please enter your API key.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      // Validate API key by making a request to the organizations endpoint
      const resp = await fetch(`${API_BASE_URL}/v1/admin/organizations`, {
        headers: { 
          "X-Api-Key": key,
          "Content-Type": "application/json",
        },
      });

      if (resp.ok) {
        // Valid API key - save to context (which also saves to localStorage)
        setApiKey(key);
        
        // Save org info if provided
        if (orgId && orgName) {
          const orgIdNum = Number(orgId);
          if (!isNaN(orgIdNum) && orgIdNum > 0) {
            const orgData = { id: orgIdNum, name: orgName };
            setOrg(orgData);
          }
        }

        // Track login event
        trackUIEvent("login", { 
          has_org: !!(orgId && orgName),
        });

        toast.success("Authentication successful");
        router.push("/");
      } else if (resp.status === 401) {
        // Invalid API key
        setError("Invalid API key");
        localStorage.removeItem("cv_api_key");
        localStorage.removeItem("cv_org");
        setIsSubmitting(false);
      } else {
        // Other error
        setError(`Authentication failed: ${resp.status}`);
        localStorage.removeItem("cv_api_key");
        localStorage.removeItem("cv_org");
        setIsSubmitting(false);
      }
    } catch (err) {
      setError("Unable to connect to API. Please check your connection.");
      localStorage.removeItem("cv_api_key");
      localStorage.removeItem("cv_org");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted/20">
      <form
        onSubmit={handleSubmit}
        className="glass-card w-full max-w-md space-y-6 p-8"
      >
        <div className="space-y-2 text-center">
          <h1 className="font-display text-2xl font-semibold">
            ConsentVault Login
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your API key to continue
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-key">API Key</Label>
            <Input
              id="api-key"
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="cv_xxxxxxxxx"
              autoFocus
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="org-id" className="text-sm font-medium text-muted-foreground">
              Organization (optional)
            </Label>
            <Input
              id="org-id"
              type="text"
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              placeholder="Organization ID"
              disabled={isSubmitting}
            />
            <Input
              id="org-name"
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Organization Name"
              disabled={isSubmitting}
            />
          </div>

          {error && (
            <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded p-3">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || !key.trim()}
          >
            {isSubmitting ? "Saving..." : "Save & Continue"}
          </Button>
        </div>
      </form>
    </div>
  );
}

