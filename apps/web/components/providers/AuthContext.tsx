"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { trackUIEvent } from "@/lib/analytics";

type Org = { id: number; name: string } | null;
type Role = "SUPERADMIN" | "ADMIN" | "AUDITOR" | "VIEWER" | null;

interface AuthContextType {
  apiKey: string | null;
  org: Org;
  role: Role;
  setApiKey: (key: string) => void;
  setOrg: (org: Org) => void;
  setRole: (role: Role) => void;
  logout: () => void;
  isSuperAdmin: boolean;
  isAuditor: boolean;
  isAdmin: boolean;
  isViewer: boolean;
  hasPermission: (required: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [org, setOrgState] = useState<Org>(null);
  const [role, setRoleState] = useState<Role>(null);

  // Load from storage
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const storedKey = localStorage.getItem("cv_api_key");
    const storedOrg = localStorage.getItem("cv_org");
    const storedRole = localStorage.getItem("cv_role");
    
    if (storedKey) {
      setApiKeyState(storedKey);
    }
    
    if (storedOrg) {
      try {
        const parsedOrg = JSON.parse(storedOrg);
        setOrgState(parsedOrg);
      } catch (e) {
        // Invalid JSON, remove it
        localStorage.removeItem("cv_org");
      }
    }

    if (storedRole) {
      setRoleState(storedRole as Role);
    }
  }, []);

  // Fetch role when apiKey changes
  useEffect(() => {
    async function fetchRole() {
      if (!apiKey) {
        setRoleState(null);
        return;
      }

      try {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const res = await fetch(`${apiBaseUrl}/v1/admin/users/me`, {
          headers: { "X-Api-Key": apiKey },
        });

        if (res.ok) {
          const data = await res.json();
          const userRole = data.role || "VIEWER";
          setRoleState(userRole);
          localStorage.setItem("cv_role", userRole);
        } else {
          // If endpoint doesn't exist or fails, try to infer from API key
          // For now, default to VIEWER if we can't determine
          setRoleState("VIEWER");
          localStorage.setItem("cv_role", "VIEWER");
        }
      } catch (error) {
        // On error, default to VIEWER
        setRoleState("VIEWER");
        localStorage.setItem("cv_role", "VIEWER");
      }
    }

    fetchRole();
  }, [apiKey]);

  const setApiKey = (key: string) => {
    setApiKeyState(key);
    localStorage.setItem("cv_api_key", key);
    // Clear role when key changes - will be re-fetched
    localStorage.removeItem("cv_role");
    setRoleState(null);
  };

  const setOrg = (org: Org) => {
    setOrgState(org);
    if (org) {
      localStorage.setItem("cv_org", JSON.stringify(org));
    } else {
      localStorage.removeItem("cv_org");
    }
  };

  const setRole = (newRole: Role) => {
    setRoleState(newRole);
    if (newRole) {
      localStorage.setItem("cv_role", newRole);
    } else {
      localStorage.removeItem("cv_role");
    }
  };

  const logout = () => {
    // Track logout event before clearing state
    trackUIEvent("logout");
    
    setApiKeyState(null);
    setOrgState(null);
    setRoleState(null);
    localStorage.removeItem("cv_api_key");
    localStorage.removeItem("cv_org");
    localStorage.removeItem("cv_role");
    localStorage.removeItem("cv_is_superadmin");
    window.location.href = "/login";
  };

  const hasPermission = (required: string): boolean => {
    // Hierarchy: SUPERADMIN > AUDITOR > ADMIN > VIEWER (as per user requirements)
    const hierarchy = ["VIEWER", "ADMIN", "AUDITOR", "SUPERADMIN"];
    const currentRole = role || "VIEWER";
    return hierarchy.indexOf(currentRole) >= hierarchy.indexOf(required);
  };

  const isSuperAdmin = role === "SUPERADMIN";
  const isAuditor = role === "AUDITOR" || isSuperAdmin;
  const isAdmin = role === "ADMIN" || isAuditor; // ADMIN is below AUDITOR in hierarchy
  const isViewer = true; // Everyone is at least a viewer

  return (
    <AuthContext.Provider
      value={{
        apiKey,
        org,
        role,
        setApiKey,
        setOrg,
        setRole,
        logout,
        isSuperAdmin,
        isAuditor,
        isAdmin,
        isViewer,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return ctx;
};

