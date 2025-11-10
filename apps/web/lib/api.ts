// apps/web/lib/api.ts

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  const orgId =
    typeof window !== "undefined" ? localStorage.getItem("active_org_id") : null;

  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");

  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (orgId) headers.set("X-Org-ID", orgId);

  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:8000";

  // Also append org_id query param as fallback (backend supports both)
  let url = `${baseUrl}${path}`;
  if (orgId && !url.includes("org_id=")) {
    const sep = url.includes("?") ? "&" : "?";
    url += `${sep}org_id=${orgId}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`❌ API ${res.status}: ${text}`);
    throw new Error(text);
  }

  return res.json();
}

// Core API calls
export async function login(email: string, password: string) {
  return apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function getMe() {
  return apiFetch("/auth/me");
}

export async function getConsents() {
  return apiFetch("/consents");
}

export async function createConsent(data: any) {
  return apiFetch("/consents", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getOrgUsers() {
  return apiFetch("/orgs/users");
}

export async function exportConsents(format = "csv") {
  return apiFetch(`/export?format=${format}`);
}

// Utility check for backend health
export async function checkBackendConnection() {
  try {
    await apiFetch("/healthz");
    return true;
  } catch {
    return false;
  }
}

export async function getCheckoutUrl() {
  const data = await apiFetch("/billing/checkout");
  return data.url;
}

// Export URL helpers (endpoints exist at /consents/export.csv and /consents/export.html)
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:8000";

export function getExportCsvUrl(orgId: string, params?: {
  subject_id?: string;
  purpose?: string;
  q?: string;
}): string {
  const queryParams = new URLSearchParams({ org_id: orgId });
  if (params?.subject_id) queryParams.append('subject_id', params.subject_id);
  if (params?.purpose) queryParams.append('purpose', params.purpose);
  if (params?.q) queryParams.append('q', params.q);
  return `${API_URL}/consents/export.csv?${queryParams}`;
}

export function getExportHtmlUrl(orgId: string, params?: {
  subject_id?: string;
  purpose?: string;
  q?: string;
}): string {
  const queryParams = new URLSearchParams({ org_id: orgId });
  if (params?.subject_id) queryParams.append('subject_id', params.subject_id);
  if (params?.purpose) queryParams.append('purpose', params.purpose);
  if (params?.q) queryParams.append('q', params.q);
  return `${API_URL}/consents/export.html?${queryParams}`;
}

// Stub functions for pages that may not be fully implemented yet
export async function revokeConsent(consentId: string, orgId: string) {
  // Note: This endpoint may not exist in the backend yet
  return apiFetch(`/consents/${consentId}/revoke`, {
    method: "POST",
  });
}

export interface UserCreate {
  email: string;
  display_name?: string;
  role: 'ADMIN' | 'AUDITOR' | 'VIEWER';
}

export async function createUser(data: UserCreate) {
  // Note: This may need org_id - check backend implementation
  return apiFetch("/orgs/users", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
