"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { setAccessToken, setActiveOrgId, setSessionToken } from "@/lib/auth";
import { useAuth } from "@/components/providers/AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated: authIsAuthenticated, isLoading, refreshUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && authIsAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isLoading, authIsAuthenticated, router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL ||
        process.env.NEXT_PUBLIC_API_BASE_URL ||
        "http://localhost:8000";

      // Login doesn't require a token, so use fetch directly
      const loginRes = await fetch(`${baseUrl}/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!loginRes.ok) {
        throw new Error("Invalid credentials");
      }

      const loginData = await loginRes.json();
      
      // ✅ Save cookie before redirect (use setSessionToken for cookie-specific storage)
      setSessionToken(loginData.access_token);
      
      // Also store in localStorage for client-side access
      setAccessToken(loginData.access_token);

      // Fetch org info and store the first org_id
      try {
        const meRes = await fetch(`${baseUrl}/v1/auth/me`, {
          headers: { Authorization: `Bearer ${loginData.access_token}` },
        });
        if (meRes.ok) {
          const me = await meRes.json();
          if (me.orgs?.length > 0) {
            const firstOrgId = me.orgs[0].org_id || me.orgs[0].id;
            if (firstOrgId) {
              setActiveOrgId(firstOrgId);
            }
          }
          
          // Refresh auth state to update the context
          await refreshUser();
          
          // Wait a bit to ensure cookie is flushed before redirect
          await new Promise((r) => setTimeout(r, 300));
          
          // Redirect based on user type
          if (me.is_superadmin) {
            // Superadmins go to platform dashboard
            router.push("/dashboard");
          } else if (me.orgs?.length > 0) {
            // Regular users with orgs go to org dashboard
            router.push("/dashboard");
          } else {
            // Regular users without orgs go to create-org
            router.push("/create-org");
          }
        } else {
          // If /me fails, still try to refresh and go to dashboard
          await refreshUser();
          await new Promise((r) => setTimeout(r, 300));
          router.push("/dashboard");
        }
      } catch (err) {
        console.warn("Could not fetch org info, will be set on dashboard load:", err);
        // Refresh auth state anyway
        await refreshUser();
        await new Promise((r) => setTimeout(r, 300));
        router.push("/dashboard");
      }
    } catch (err) {
      alert("Invalid credentials");
      setIsSubmitting(false);
    }
  }

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  // Don't render login form if already authenticated (will redirect)
  if (authIsAuthenticated) {
    return null;
  }

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <form
        onSubmit={handleLogin}
        className="bg-white p-8 rounded-xl shadow-lg w-96 space-y-4"
      >
        <h1 className="text-2xl font-semibold text-center">ConsentVault Login</h1>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border p-2 rounded-md"
          required
          disabled={isSubmitting}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border p-2 rounded-md"
          required
          disabled={isSubmitting}
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-md"
        >
          {isSubmitting ? "Logging in..." : "Log In"}
        </button>
      </form>
    </div>
  );
}
