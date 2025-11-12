/**
 * API utilities for ConsentVault
 */

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export const getBaseUrl = () => {
  // For client-side (browser), always use localhost since browsers can't resolve Docker hostnames
  // For server-side (SSR), we could use the Docker hostname, but client-side is what matters here
  if (typeof window !== "undefined") {
    // Client-side: use localhost since browser runs on host machine
    return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  }
  // Server-side: could use Docker hostname, but default to localhost for consistency
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
};

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");

  if (token) headers.set("Authorization", `Bearer ${token}`);

  // Always include org header if available
  const activeOrgId = typeof window !== "undefined" ? localStorage.getItem("active_org_id") : null;
  if (activeOrgId) headers.set("X-Org-ID", activeOrgId);

  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${path}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (!res.ok) {
      if (res.status === 401) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("access_token");
          window.dispatchEvent(new CustomEvent("auth-expired"));
        }
        throw new AuthError("Authentication expired. Please log in again.");
      }
      throw new Error(`API request failed: ${res.status}`);
    }

    return res.json();
  } catch (error) {
    // Handle network errors (e.g., "Failed to fetch")
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new Error(
        `Failed to connect to API at ${baseUrl}. Please ensure the API server is running.`
      );
    }
    throw error;
  }
}

export async function getMe() {
  return apiFetch("/auth/me");
}
