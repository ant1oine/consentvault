const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface ApiError {
  detail: string
}

// Types matching backend schemas
export interface ConsentResponse {
  id: number
  organization_id: number
  external_user_id: string
  purpose_id: number
  purpose_code: string | null
  status: 'granted' | 'withdrawn'
  last_event_at: string
  source_system_id: number | null
  evidence_ref: string | null
  encrypted_fields: Record<string, any> | null
}

export interface ConsentEventResponse {
  id: string
  organization_id: number
  aggregate_id: number
  purpose_id: number
  status: 'granted' | 'withdrawn'
  method: 'checkbox' | 'tos' | 'contract' | 'other'
  source: string | null
  timestamp: string
  evidence_ref: string | null
}

export interface PurposeResponse {
  id: number
  organization_id: number
  code: string
  description: string | null
  active: boolean
  created_at: string
}

export interface PurposeCreate {
  code: string
  description?: string | null
}

export interface PolicyResponse {
  id: number
  organization_id: number
  purpose_id: number
  retention_days: number
  active: boolean
  created_at: string
}

export interface PolicyCreate {
  purpose_id: number
  retention_days: number
  active?: boolean
}

export interface WebhookEndpointResponse {
  id: number
  organization_id: number
  url: string
  active: boolean
  created_at: string
}

export interface WebhookEndpointCreate {
  url: string
  secret: string
}

export interface DataRightRequestResponse {
  id: string
  organization_id: number
  external_user_id: string
  right: 'access' | 'erasure' | 'portability'
  status: 'open' | 'in_progress' | 'completed' | 'rejected'
  opened_at: string
  closed_at: string | null
  reason: string | null
  evidence_ref: string | null
}

export interface DataRightRequestComplete {
  evidence_ref: string
}

export interface AuditLogResponse {
  id: string
  organization_id: number
  actor_api_key_id: number | null
  event_type: string
  object_type: string
  object_id: string
  prev_hash: string
  entry_hash: string
  request_fingerprint: string | null
  created_at: string
}

function getApiKey(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('consentvault_api_key')
}

async function fetchWithAuth(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const apiKey = getApiKey()
  
  if (!apiKey) {
    throw new Error('API key not found. Please configure it in settings.')
  }

  const headers = {
    'X-API-Key': apiKey,
    'Content-Type': 'application/json',
    ...options.headers,
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(error.detail || `HTTP ${response.status}`)
  }

  return response
}

// Purposes
export async function getPurposes(): Promise<PurposeResponse[]> {
  const response = await fetchWithAuth('/v1/admin/purposes')
  return response.json()
}

export async function createPurpose(data: PurposeCreate): Promise<PurposeResponse> {
  const response = await fetchWithAuth('/v1/admin/purposes', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return response.json()
}

// Policies
export async function getPolicies(): Promise<PolicyResponse[]> {
  const response = await fetchWithAuth('/v1/admin/policies')
  return response.json()
}

export async function createPolicy(data: PolicyCreate): Promise<PolicyResponse> {
  const response = await fetchWithAuth('/v1/admin/policies', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return response.json()
}

// Consents
export async function getConsents(params?: {
  limit?: number
  offset?: number
}): Promise<ConsentResponse[]> {
  const searchParams = new URLSearchParams()
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  if (params?.offset) searchParams.set('offset', params.offset.toString())
  
  const query = searchParams.toString() ? `?${searchParams.toString()}` : ''
  const response = await fetchWithAuth(`/v1/consents${query}`)
  return response.json()
}

export async function getLatestConsent(
  external_user_id: string,
  purpose_code: string
): Promise<ConsentResponse> {
  const response = await fetchWithAuth(
    `/v1/consents/latest?external_user_id=${encodeURIComponent(external_user_id)}&purpose_code=${encodeURIComponent(purpose_code)}`
  )
  return response.json()
}

// Rights
export async function getRights(params?: {
  status?: 'open' | 'in_progress' | 'completed' | 'rejected'
  right?: 'access' | 'erasure' | 'portability'
  limit?: number
  offset?: number
}): Promise<DataRightRequestResponse[]> {
  const searchParams = new URLSearchParams()
  if (params?.status) searchParams.set('status', params.status)
  if (params?.right) searchParams.set('right', params.right)
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  if (params?.offset) searchParams.set('offset', params.offset.toString())
  
  const query = searchParams.toString() ? `?${searchParams.toString()}` : ''
  const response = await fetchWithAuth(`/v1/rights${query}`)
  return response.json()
}

export async function completeRight(
  request_id: string,
  data: DataRightRequestComplete
): Promise<DataRightRequestResponse> {
  const response = await fetchWithAuth(`/v1/rights/${request_id}/complete`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return response.json()
}

// Audit
export async function getAuditLogs(params?: {
  event_type?: string
  object_type?: string
  since?: string
  limit?: number
  offset?: number
}): Promise<AuditLogResponse[]> {
  const searchParams = new URLSearchParams()
  if (params?.event_type) searchParams.set('event_type', params.event_type)
  if (params?.object_type) searchParams.set('object_type', params.object_type)
  if (params?.since) searchParams.set('since', params.since)
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  if (params?.offset) searchParams.set('offset', params.offset.toString())
  
  const query = searchParams.toString() ? `?${searchParams.toString()}` : ''
  const response = await fetchWithAuth(`/v1/audit${query}`)
  return response.json()
}

// Webhooks
export async function getWebhooks(): Promise<WebhookEndpointResponse[]> {
  const response = await fetchWithAuth('/v1/admin/webhooks')
  return response.json()
}

export async function createWebhook(data: WebhookEndpointCreate): Promise<WebhookEndpointResponse> {
  const response = await fetchWithAuth('/v1/admin/webhooks', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return response.json()
}

export async function deleteWebhook(id: number): Promise<void> {
  const response = await fetchWithAuth(`/v1/admin/webhooks/${id}`, {
    method: 'DELETE',
  })
  if (response.status !== 204) {
    const error: ApiError = await response.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(error.detail || `HTTP ${response.status}`)
  }
}

