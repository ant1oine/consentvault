/**
 * Unified API utilities for ConsentVault
 * Supports both authenticated (JWT) and API key modes.
 */
import { clearAuth } from "./auth";

// Custom error class for auth errors
export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

const getBaseUrl = () => {
  return (
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:8000"
  );
};

const handleError = async (res: Response) => {
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
};

/**
 * For logged-in users via session/JWT (e.g., dashboard actions)
 * This is the primary method for dashboard pages.
 */
export async function apiFetchAuthed(path: string, options: RequestInit = {}) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  const orgId =
    typeof window !== "undefined" ? localStorage.getItem("active_org_id") : null;

  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");

  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (orgId) headers.set("X-Org-ID", orgId);

  const baseUrl = getBaseUrl();
  
  // Also append org_id query param as fallback (backend supports both)
  let url = `${baseUrl}${path}`;
  if (orgId && !url.includes("org_id=")) {
    const sep = url.includes("?") ? "&" : "?";
    url += `${sep}org_id=${orgId}`;
  }

  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers,
  });

  await handleError(res);
  return res.json();
}

/**
 * For external SDKs or org integrations using x-api-key
 * Use this only for SDK/widget integrations, not dashboard pages.
 */
export async function apiFetchWithApiKey(path: string, apiKey: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  headers.set("X-API-Key", apiKey);

  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${path}`;

  const res = await fetch(url, {
    ...options,
    headers,
  });

  await handleError(res);
  return res.json();
}

/**
 * Smart hybrid mode — auto-detects whether to use JWT or API key.
 * Use this for generic components or shared libraries.
 */
export async function smartApiFetch(path: string, options: RequestInit = {}) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  const apiKey =
    typeof window !== "undefined" ? localStorage.getItem("api_key") : null;
  const orgId =
    typeof window !== "undefined" ? localStorage.getItem("active_org_id") : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  // Prefer API key if available (for SDK/widget usage)
  if (apiKey) {
    headers["X-API-Key"] = apiKey;
  } else if (token) {
    // Otherwise use JWT token (for dashboard usage)
    headers["Authorization"] = `Bearer ${token}`;
    if (orgId) headers["X-Org-ID"] = orgId;
  }

  const baseUrl = getBaseUrl();
  let url = `${baseUrl}${path}`;
  
  // Append org_id query param if available and not already present
  if (orgId && !url.includes("org_id=")) {
    const sep = url.includes("?") ? "&" : "?";
    url += `${sep}org_id=${orgId}`;
  }

  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers,
  });

  await handleError(res);
  return res.json();
}

// Legacy function - kept for backward compatibility but redirects to apiFetchAuthed
export async function apiFetch(path: string, options: RequestInit = {}) {
  return apiFetchAuthed(path, options);
}

// Core API calls
export async function login(email: string, password: string) {
  return apiFetchAuthed("/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function getMe() {
  return apiFetchAuthed("/v1/auth/me");
}

export async function getConsents(orgId?: string) {
  // Dashboard users should use JWT auth, not API key
  const path = orgId ? `/consents?org_id=${orgId}` : "/consents";
  return apiFetchAuthed(path);
}

export async function getOrgs() {
  return apiFetchAuthed("/v1/orgs");
}

export async function getOrg(orgId: string) {
  return apiFetchAuthed(`/v1/orgs/${orgId}`);
}

export async function createOrg(data: { name: string; region: string }) {
  return apiFetchAuthed("/v1/orgs", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getUsers(orgId: string) {
  return apiFetchAuthed(`/v1/users?org_id=${orgId}`);
}

export async function createUser(data: { org_id: string; email: string; name: string; role: string }) {
  return apiFetchAuthed("/v1/users", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getDashboardSummary(orgId?: string) {
  const path = orgId ? `/v1/dashboard/summary?org_id=${orgId}` : "/v1/dashboard/summary";
  return apiFetchAuthed(path);
}

export async function getPlatformOrgs() {
  return apiFetchAuthed("/v1/dashboard/platform/orgs");
}

export async function getPlatformOrgDetails(orgId: string) {
  return apiFetchAuthed(`/v1/dashboard/platform/orgs/${orgId}`);
}

export async function getAuditLogs(orgId?: string) {
  const path = orgId ? `/v1/audit?org_id=${orgId}` : "/v1/audit";
  return apiFetchAuthed(path);
}

export async function getAuditLogsSimple() {
  // Use the simplified endpoint that requires JWT auth only
  // This endpoint filters logs based on user permissions automatically
  return apiFetchAuthed("/v1/audit/logs");
}

export async function getDataRights(orgId?: string) {
  const path = orgId ? `/v1/data-rights?org_id=${orgId}` : "/v1/data-rights";
  return apiFetchAuthed(path);
}

export async function createDataRightRequest(data: {
  subject_email: string;
  request_type: "access" | "rectify" | "erase";
  notes?: string;
}) {
  return apiFetchAuthed("/v1/data-rights", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateDataRightStatus(requestId: string, status: "processing" | "completed" | "rejected") {
  return apiFetchAuthed(`/v1/data-rights/${requestId}/status`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}

export async function getOrgDetails(orgId: string) {
  return apiFetchAuthed(`/v1/orgs/${orgId}`);
}

export async function createConsent(data: any) {
  return apiFetchAuthed("/consents", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getOrgUsers() {
  return apiFetchAuthed("/v1/users");
}

export async function exportConsents(format = "csv") {
  return apiFetchAuthed(`/export?format=${format}`);
}

// Utility check for backend health
export async function checkBackendConnection() {
  try {
    await apiFetchAuthed("/healthz");
    return true;
  } catch {
    return false;
  }
}

export async function getCheckoutUrl() {
  const data = await apiFetchAuthed("/billing/checkout");
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
  return apiFetchAuthed(`/consents/${consentId}/revoke`, {
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
  return apiFetchAuthed("/orgs/users", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
