// Central auth utilities for token management
export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

export function getActiveOrgId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("active_org_id");
}

export function setAccessToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("access_token", token);
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
}

export function isAuthenticated(): boolean {
  return getAccessToken() !== null;
}

