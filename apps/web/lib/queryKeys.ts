/**
 * Query keys for React Query cache management.
 */

export const queryKeys = {
  consents: (params?: { limit?: number; offset?: number; apiKey?: string }) => [
    'consents',
    params?.limit,
    params?.offset,
    params?.apiKey,
  ],
  dashboardSummary: (orgId: string) => ['dashboard', 'summary', orgId],
  orgDetails: (orgId: string) => ['orgs', orgId],
  organizations: () => ['organizations'],
  rights: () => ['rights'],
  users: () => ['users'],
  purposes: () => ['purposes'],
  policies: () => ['policies'],
  webhooks: () => ['webhooks'],
  auditLogs: () => ['auditLogs'],
  auditLogsByOrg: (orgId?: string) => ['auditLogs', orgId],
  dataRights: (orgId?: string) => ['dataRights', orgId],
}




