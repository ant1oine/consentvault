"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, getActiveOrgId, setActiveOrgId, clearAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";

interface Org {
  org_id: string;
  role: string;
}

interface User {
  email: string;
  orgs: Org[];
}

interface AuthContextType {
  user: User | null;
  activeOrgId: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setActiveOrgId: (orgId: string) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [activeOrgId, setActiveOrgIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const me = await apiFetch("/auth/me");
      setUser(me);

      // Set active org if not already set
      const storedOrgId = getActiveOrgId();
      if (me.orgs?.length > 0) {
        if (storedOrgId && me.orgs.some((org) => org.org_id === storedOrgId)) {
          setActiveOrgIdState(storedOrgId);
        } else {
          const firstOrgId = me.orgs[0].org_id;
          setActiveOrgIdState(firstOrgId);
          setActiveOrgId(firstOrgId);
        }
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
      // Token might be invalid, clear auth
      clearAuth();
      setUser(null);
      router.replace("/login");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Listen for storage changes (e.g., when token is set from login page)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "access_token" && e.newValue) {
        refreshUser();
      }
    };

    // Also listen for custom event for same-tab updates
    const handleCustomStorageChange = () => {
      refreshUser();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("auth-storage-change", handleCustomStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("auth-storage-change", handleCustomStorageChange);
    };
  }, [refreshUser]);

  const handleSetActiveOrgId = (orgId: string) => {
    setActiveOrgIdState(orgId);
    setActiveOrgId(orgId);
    // Refresh to reload data with new org context
    window.location.reload();
  };

  const handleLogout = () => {
    clearAuth();
    setUser(null);
    setActiveOrgIdState(null);
    router.replace("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        activeOrgId,
        isLoading,
        isAuthenticated: !!user && !!getAccessToken(),
        setActiveOrgId: handleSetActiveOrgId,
        logout: handleLogout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

