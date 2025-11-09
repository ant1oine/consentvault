"use client";

import { useAuth } from "@/components/providers/AuthContext";

interface ProtectedRouteProps {
  requiredRole: "VIEWER" | "ADMIN" | "AUDITOR" | "SUPERADMIN";
  children: React.ReactNode;
}

export default function ProtectedRoute({
  requiredRole,
  children,
}: ProtectedRouteProps) {
  const { role, hasPermission } = useAuth();

  if (!role) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!hasPermission(requiredRole)) {
    return (
      <div className="p-8 text-center">
        <div className="max-w-md mx-auto">
          <h2 className="text-xl font-semibold mb-2">Insufficient Permissions</h2>
          <p className="text-muted-foreground">
            You do not have permission to access this section. Required role:{" "}
            <span className="font-medium">{requiredRole}</span>
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

