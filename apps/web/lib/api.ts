/**
 * API utilities for ConsentVault
 */

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

const getBaseUrl = () => {
  return (
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8000/v1"
  );
};

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  const orgId =
    typeof window !== "undefined" ? localStorage.getItem("active_org_id") : null;

  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");

  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (orgId) headers.set("X-Org-ID", orgId);

  const baseUrl = getBaseUrl();
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

  if (!res.ok) {
    if (res.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("access_token");
        localStorage.removeItem("active_org_id");
        window.dispatchEvent(new CustomEvent("auth-expired"));
      }
      throw new AuthError("Authentication expired. Please log in again.");
    }
    throw new Error(`API request failed: ${res.status}`);
  }

  return res.json();
}

export async function getMe() {
  return apiFetch("/auth/me");
}
