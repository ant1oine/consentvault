"use client";

import { useEffect } from "react";

/**
 * Track a UI event (non-blocking, fire-and-forget).
 * Events are sent to the backend audit log for analytics.
 */
export function trackUIEvent(event: string, details?: Record<string, any>) {
  // Only run in browser
  if (typeof window === "undefined") return;

  const apiKey = localStorage.getItem("cv_api_key");
  const orgStr = localStorage.getItem("cv_org");
  
  // Skip if no auth context
  if (!apiKey) return;

  const payload = {
    event,
    details: { ...details, ts: new Date().toISOString() },
  };

  // Get organization ID from stored org
  let orgId = "";
  if (orgStr) {
    try {
      const org = JSON.parse(orgStr);
      orgId = org?.id?.toString() || "";
    } catch {
      // Invalid JSON, ignore
    }
  }

  // Send in background (non-blocking, errors are silently ignored)
  fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/v1/audit/ui-events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": apiKey,
      ...(orgId ? { "X-Organization-ID": orgId } : {}),
    },
    body: JSON.stringify(payload),
  }).catch(() => {
    // Silently fail - analytics should never block the UI
  });
}

/**
 * React hook to automatically track page views.
 * Call this at the top of each page component.
 */
export function usePageAnalytics(name: string) {
  useEffect(() => {
    trackUIEvent("page_view", { page: name });
  }, [name]);
}

