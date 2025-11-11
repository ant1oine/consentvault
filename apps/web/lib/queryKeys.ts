/**
 * Query keys for React Query cache management.
 */

export const queryKeys = {
  consents: (params?: { limit?: number; offset?: number; orgId?: string }) => [
    'consents',
    params?.limit,
    params?.offset,
    params?.orgId,
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




