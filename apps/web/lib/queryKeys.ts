'use client'

export const queryKeys = {
  consents: (params?: { limit?: number; offset?: number }) =>
    ['consents', params ?? {}] as const,
  rights: () => ['rights'] as const,
  purposes: () => ['purposes'] as const,
  policies: () => ['policies'] as const,
  organizations: () => ['organizations'] as const,
  users: () => ['users'] as const,
  webhooks: () => ['webhooks'] as const,
  auditLogs: () => ['audit-logs'] as const,
}
