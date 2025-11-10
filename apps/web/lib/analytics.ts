/**
 * Minimal analytics implementation for ConsentVault Core.
 */

export function usePageAnalytics(page: string) {
  // Minimal implementation - can be extended later
  if (typeof window !== 'undefined') {
    // Track page view if needed
    console.debug(`[Analytics] Page view: ${page}`)
  }
}

export function trackUIEvent(event: string, data?: Record<string, unknown>) {
  // Minimal implementation - can be extended later
  if (typeof window !== 'undefined') {
    console.debug(`[Analytics] UI Event: ${event}`, data)
  }
}
