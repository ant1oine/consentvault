// apps/web/lib/api.ts
import { clearAuth } from "./auth";

// Custom error class for auth errors
export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

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
    let errorMessage = `Request failed with status ${res.status}`;
    let errorDetail: any = null;
    
    try {
      const text = await res.text();
      if (text) {
        try {
          errorDetail = JSON.parse(text);
          errorMessage = errorDetail.detail || errorDetail.message || errorMessage;
        } catch {
          errorMessage = text;
        }
      }
    } catch {
      // If we can't read the response, use default message
    }
    
    // Handle 401 Unauthorized (token expired or invalid)
    if (res.status === 401) {
      // Clear auth tokens
      if (typeof window !== "undefined") {
        clearAuth();
        // Dispatch event to notify AuthProvider
        window.dispatchEvent(new CustomEvent("auth-expired"));
      }
      // Throw a specific error type that can be caught and handled
      // Don't log AuthErrors as they're expected and handled gracefully
      throw new AuthError(errorMessage || "Authentication expired. Please log in again.");
    }
    
    // For other errors, log and throw normally
    console.error(`❌ API ${res.status}:`, errorDetail || errorMessage);
    const error = new Error(errorMessage);
    if (errorDetail) {
      (error as any).detail = errorDetail;
    }
    throw error;
  }

  return res.json();
}

// Core API calls
export async function login(email: string, password: string) {
  return apiFetch("/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function getMe() {
  return apiFetch("/v1/auth/me");
}

// Helper for API requests with API key (for consent endpoints)
export async function apiFetchWithApiKey(path: string, apiKey: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  headers.set("Authorization", `Bearer ${apiKey}`);

  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:8000";

  const url = `${baseUrl}${path}`;

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

export async function getConsents(apiKey?: string) {
  if (apiKey) {
    return apiFetchWithApiKey("/v1/consents", apiKey);
  }
  return apiFetch("/consents");
}

export async function getOrgs() {
  return apiFetch("/v1/orgs");
}

export async function getOrg(orgId: string) {
  return apiFetch(`/v1/orgs/${orgId}`);
}

export async function createOrg(data: { name: string; region: string }) {
  return apiFetch("/v1/orgs", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getUsers(orgId: string) {
  return apiFetch(`/v1/users?org_id=${orgId}`);
}

export async function createUser(data: { org_id: string; email: string; name: string; role: string }) {
  return apiFetch("/v1/users", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getDashboardSummary(orgId: string) {
  return apiFetch(`/v1/dashboard/summary?org_id=${orgId}`);
}

export async function getAuditLogs(orgId?: string) {
  const path = orgId ? `/v1/audit?org_id=${orgId}` : "/v1/audit";
  return apiFetch(path);
}

export async function getDataRights(orgId?: string) {
  const path = orgId ? `/v1/data-rights?org_id=${orgId}` : "/v1/data-rights";
  return apiFetch(path);
}

export async function createDataRightRequest(data: {
  subject_email: string;
  request_type: "access" | "rectify" | "erase";
  notes?: string;
}) {
  return apiFetch("/v1/data-rights", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateDataRightStatus(requestId: string, status: "processing" | "completed" | "rejected") {
  return apiFetch(`/v1/data-rights/${requestId}/status`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}

export async function getOrgDetails(orgId: string) {
  return apiFetch(`/v1/orgs/${orgId}`);
}

export async function createConsent(data: any) {
  return apiFetch("/consents", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getOrgUsers() {
  return apiFetch("/v1/users");
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

export async function createUserLegacy(data: UserCreate) {
  // Legacy endpoint - kept for backward compatibility
  return apiFetch("/orgs/users", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
