// Central auth utilities for token management
// Uses both localStorage (for client-side) and cookies (for middleware/server-side)

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  // Check localStorage first (primary storage)
  const token = localStorage.getItem("access_token");
  // Also sync to cookie for middleware access
  if (token) {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `access_token=${token}; Path=/; SameSite=Lax${secure}`;
  }
  return token;
}

export function getActiveOrgId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("active_org_id");
}

export function setAccessToken(token: string): void {
  if (typeof window === "undefined") return;
  // Store in localStorage for client-side access
  localStorage.setItem("access_token", token);
  // Also set cookie for middleware/server-side access with proper attributes
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `access_token=${token}; Path=/; SameSite=Lax${secure}`;
  // Dispatch custom event for same-tab updates
  window.dispatchEvent(new Event("auth-storage-change"));
}

export function setActiveOrgId(orgId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("active_org_id", orgId);
}

export function clearAuth(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("access_token");
  localStorage.removeItem("active_org_id");
  // Clear cookie as well
  document.cookie = "access_token=; Max-Age=0; Path=/; SameSite=Lax";
}

export function isAuthenticated(): boolean {
  return getAccessToken() !== null;
}

// Cookie-specific helpers for server-side/middleware compatibility
export function setSessionToken(token: string) {
  if (typeof window === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `access_token=${token}; Path=/; SameSite=Lax${secure}`;
}

export function clearSessionToken() {
  if (typeof window === "undefined") return;
  document.cookie = "access_token=; Max-Age=0; Path=/; SameSite=Lax";
}

export function getSessionToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/access_token=([^;]+)/);
  return match ? match[1] : null;
}

