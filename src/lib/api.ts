import { type SseMessage, SseParser } from './sse'

// The console is served from console.<domain> and the API from api.<domain>,
// so one build finds its API from the page's own host. VITE_API_URL overrides
// that for local development.
const API_URL: string =
  import.meta.env.VITE_API_URL ??
  `${location.protocol}//api.${location.host.replace(/^console\./, '')}/v1`

// The server refuses a call without it, so no other site's form can use the cookie.
const requestedWith = { 'x-requested-with': 'shopnexus-console' }

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
  // VITE_MOCK_AI=1 serves the AI and settings paths from fixtures (lib/mock).
  // The build drops this branch when it is unset.
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
      ...requestedWith,
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

/**
 * Reads a server-sent event stream from the API, resuming after the event
 * with id `after`. EventSource cannot send X-Requested-With, so this reads
 * the fetch body.
 */
export async function* apiStream(path: string, { after = 0, signal }: { after?: number; signal?: AbortSignal } = {}): AsyncGenerator<SseMessage> {
  const res = await fetch(`${API_URL}${path}${after ? `?after=${after}` : ''}`, {
    credentials: 'include',
    signal,
    headers: { accept: 'text/event-stream', ...requestedWith, ...(after ? { 'last-event-id': String(after) } : {}) },
  })
  if (!res.ok || !res.body) throw new ApiError(res.status, res.status === 404 ? 'not_found' : 'stream_failed', res.statusText)
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
  const parser = new SseParser()
  for (;;) {
    const { value, done } = await reader.read()
    if (done) return
    yield* parser.push(value)
  }
}

export type Role = 'moderator' | 'admin'

export interface Me {
  id: string
  email: string
  display_name: string
  role: Role
  /** The ops dashboards and the lowest role that opens each, as Settings › Tools sets them. */
  dashboards?: { app: string; name: string; floor: Role }[]
}

export interface Member {
  id: string
  email: string
  display_name: string
  role: Role
  status: 'active' | 'disabled'
  totp_enrolled: boolean
  locked_until?: string
  /** True while the member holds a temporary password. */
  must_change_password: boolean
  /** The start of the newest session; absent before the first sign-in. */
  last_sign_in_at?: string
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
  | 'member.rename'
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

/** A query retries once, and not at all on a 404. */
export const noRetryOn404 = (n: number, e: unknown) => !(e instanceof ApiError && e.status === 404) && n < 1

/** A string field of an action's details ("reason", "until"), or "". */
export const actionDetail = (a: Action, key: string) => (typeof a.details?.[key] === 'string' ? (a.details[key] as string) : '')
