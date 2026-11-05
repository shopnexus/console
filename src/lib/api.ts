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
 * Calls the Go server. The staff_session cookie rides along on /v1/staff, and
 * every staff call carries X-Requested-With, which the server requires so
 * that no other site's form can use the cookie.
 */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
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
  | 'staff.create'
  | 'staff.disable'
  | 'staff.enable'
  | 'staff.reset_password'
  | 'staff.reset_totp'
  | 'staff.unlock'

export interface Action {
  id: string
  at: string
  actor: { kind: 'staff' | 'cli'; staff_id?: string; display_name?: string }
  action: ActionKind
  target: { kind: 'account' | 'staff'; id: string }
  details?: Record<string, unknown>
}

export interface Page<T> {
  items: T[]
  next_cursor?: string
}

export const roleName: Record<Role, string> = { moderator: 'Kiểm duyệt viên', admin: 'Quản trị viên' }
