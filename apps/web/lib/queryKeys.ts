/**
 * Query keys for React Query cache management.
 */

export const queryKeys = {
  consents: (params?: { limit?: number; offset?: number }) => [
    'consents',
    params?.limit,
    params?.offset,
  ],
  organizations: () => ['organizations'],
  rights: () => ['rights'],
  users: () => ['users'],
  purposes: () => ['purposes'],
  policies: () => ['policies'],
  webhooks: () => ['webhooks'],
  auditLogs: () => ['auditLogs'],
}




