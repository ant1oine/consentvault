"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, getActiveOrgId, setActiveOrgId, clearAuth } from "@/lib/auth";
import { getMe, AuthError } from "@/lib/api";

interface Org {
  org_id: string;
  id?: string; // For compatibility
  name?: string;
  role: string;
}

interface User {
  email: string;
  orgs: Org[];
  is_superadmin?: boolean;
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

// Maximum loading timeout (3 seconds)
const MAX_LOADING_TIMEOUT = 3000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [activeOrgId, setActiveOrgIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingTimeout, setLoadingTimeout] = useState<NodeJS.Timeout | null>(null);

  const refreshUser = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setUser(null);
      setActiveOrgIdState(null);
      setIsLoading(false);
      return;
    }

    try {
      const me = await getMe();
      setUser(me);

      // Set active org if not already set
      const storedOrgId = getActiveOrgId();
      if (me.orgs?.length > 0) {
        if (storedOrgId && me.orgs.some((org) => org.org_id === storedOrgId || org.id === storedOrgId)) {
          setActiveOrgIdState(storedOrgId);
        } else {
          const firstOrgId = me.orgs[0].org_id || me.orgs[0].id;
          if (firstOrgId) {
            setActiveOrgIdState(firstOrgId);
            setActiveOrgId(firstOrgId);
          }
        }
      } else {
        // No orgs - clear active org
        setActiveOrgIdState(null);
        // If user has no orgs and is not superadmin, redirect to create-org
        if (!me.is_superadmin) {
          // Don't redirect immediately - let the component handle it
          // This allows the dashboard to show "no org" message
        }
      }
      
      setIsLoading(false);
    } catch (error) {
      // If it's an AuthError, the apiFetch already cleared auth and dispatched the event
      // So we just need to update local state - the event handler will redirect
      if (error instanceof AuthError) {
        setUser(null);
        setActiveOrgIdState(null);
        setIsLoading(false);
        // Immediately redirect to login
        router.replace("/login");
      } else {
        // For other errors, log and clear auth manually
        console.error("Failed to fetch user:", error);
        clearAuth();
        setUser(null);
        setActiveOrgIdState(null);
        setIsLoading(false);
        router.replace("/login");
      }
    }
  }, [router]);

  // Set loading timeout on mount
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.warn("Auth loading timeout - forcing loading to false");
        setIsLoading(false);
      }
    }, MAX_LOADING_TIMEOUT);
    
    setLoadingTimeout(timeout);
    
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, []);

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

    // Listen for auth expiration events (from apiFetch 401 handling)
    const handleAuthExpired = () => {
      setUser(null);
      setActiveOrgIdState(null);
      setIsLoading(false);
      router.replace("/login");
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("auth-storage-change", handleCustomStorageChange);
    window.addEventListener("auth-expired", handleAuthExpired);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("auth-storage-change", handleCustomStorageChange);
      window.removeEventListener("auth-expired", handleAuthExpired);
    };
  }, [refreshUser, router]);

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

