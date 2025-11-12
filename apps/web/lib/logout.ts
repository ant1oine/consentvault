/**
 * Handles user logout and cleanup.
 * Clears all auth-related data (localStorage + cookies) and redirects to /login.
 */
import { clearAuth } from "./auth";

export function logout() {
  if (typeof window !== "undefined") {
    clearAuth();
    window.location.href = "/login";
  }
}

