// The console is served from console.<domain> and the API from api.<domain>,
// so one build finds its API from the page's own host. VITE_API_URL overrides
// that for local development.
const API_URL: string =
  import.meta.env.VITE_API_URL ??
  `${location.protocol}//api.${location.host.replace(/^console\./, '')}/v1`

/** An answer outside 2xx, with the server's error code ("invalid_credentials"). */
export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

/**
 * Calls the Go server. The console_session cookie rides along on /v1/console, and
 * every call carries X-Requested-With, which the server requires so
 * that no other site's form can use the cookie.
 */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  // VITE_MOCK_AI=1 serves the AI paths the server does not have yet from
  // fixtures (lib/mock). The build drops this branch when it is unset.
  if (import.meta.env.VITE_MOCK_AI === '1') {
    const { mockApi, unmocked, MockError } = await import('./mock')
    try {
      const out = await mockApi(init?.method ?? 'GET', path, init?.body ? JSON.parse(String(init.body)) : undefined)
      if (out !== unmocked) return out as T
    } catch (e) {
      throw e instanceof MockError ? new ApiError(e.status, e.code, e.code) : e
    }
  }
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      accept: 'application/json',
      'x-requested-with': 'shopnexus-console',
      ...(init?.body ? { 'content-type': 'application/json' } : {}),
      ...init?.headers,
    },
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null
    throw new ApiError(res.status, body?.error?.code ?? 'unknown', body?.error?.message ?? res.statusText)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

/** POSTs body as JSON. */
export function post<T>(path: string, body?: unknown): Promise<T> {
  return api<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) })
}

export function patch<T>(path: string, body: unknown): Promise<T> {
  return api<T>(path, { method: 'PATCH', body: JSON.stringify(body) })
}

export function put<T>(path: string, body: unknown): Promise<T> {
  return api<T>(path, { method: 'PUT', body: JSON.stringify(body) })
}

export function del(path: string): Promise<void> {
  return api<void>(path, { method: 'DELETE' })
}

/** The full URL of an API path, for a stream the fetch above cannot read. */
export function apiUrl(path: string): string {
  return `${API_URL}${path}`
}

export type Role = 'moderator' | 'admin'

export interface Me {
  id: string
  email: string
  display_name: string
  role: Role
}

export interface Member {
  id: string
  email: string
  display_name: string
  role: Role
  status: 'active' | 'disabled'
  totp_enrolled: boolean
  locked_until?: string
  created_at: string
}

export interface Account {
  id: string
  display_name: string
  status: 'active' | 'suspended'
  suspended_until?: string
  suspend_reason?: string
  created_at: string
}

export type ActionKind =
  | 'account.suspend'
  | 'account.unsuspend'
  | 'member.create'
  | 'member.disable'
  | 'member.enable'
  | 'member.reset_password'
  | 'member.reset_totp'
  | 'member.unlock'
  | 'report.dismiss'
  | 'report.resolve'
  | 'report.reopen'
  | 'listing.hide'
  | 'listing.unhide'

export interface Action {
  id: string
  at: string
  actor: { kind: 'member' | 'cli'; member_id?: string; display_name?: string }
  action: ActionKind
  target: { kind: 'account' | 'member' | 'listing'; id: string }
  details?: Record<string, unknown>
}

export interface Page<T> {
  items: T[]
  next_cursor?: string
  /** Only on lists that count, such as the suspended accounts. */
  total?: number
}

export const roleName: Record<Role, string> = { moderator: 'Moderator', admin: 'Admin' }

/** The first 8 characters of an opaque id, for a row ("7b1c22e0"). */
export const shortId = (id: string) => id.slice(0, 8)
