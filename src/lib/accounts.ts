import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useSyncExternalStore } from 'react'
import { type Account, type Action, ApiError, api, type Page, post } from './api'

export type AccountTab = 'all' | 'suspended'

export interface Identity {
  kind: 'phone' | 'email'
  value: string
}

export interface AccountDetail {
  account: Account
  identities: Identity[]
  /** The 20 latest console actions on the account, newest first. */
  actions: Action[]
}

/** Tài khoản's list: every account newest first, or the suspended ones, the term that ends first first. */
export function useAccountList(tab: AccountTab) {
  const query = useInfiniteQuery({
    queryKey: ['console', 'accounts', 'list', tab],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => {
      const q = new URLSearchParams({ limit: '50', ...(tab === 'suspended' ? { status: 'suspended' } : {}), ...(pageParam ? { cursor: pageParam } : {}) })
      return api<Page<Account>>(`/console/accounts?${q}`)
    },
    getNextPageParam: (last) => last.next_cursor,
  })
  const items = useMemo(() => query.data?.pages.flatMap((p) => p.items), [query.data])
  return { ...query, items }
}

/** An account with its identities and the console's actions on it. */
export function useAccountDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['console', 'accounts', 'detail', id],
    queryFn: () => api<AccountDetail>(`/console/accounts/${id}`),
    enabled: !!id,
    retry: (n, e) => !(e instanceof ApiError && e.status === 404) && n < 1,
  })
}

/** Suspends or unsuspends an account; every account query reads again after either. */
export function useAccountCommands(id: string) {
  const client = useQueryClient()
  const done = () => client.invalidateQueries({ queryKey: ['console', 'accounts'] })
  return {
    suspend: useMutation({
      mutationFn: (body: { reason: string; until?: string }) => post<Account>(`/console/accounts/${id}/suspend`, body),
      onSettled: done,
    }),
    unsuspend: useMutation({ mutationFn: () => post<Account>(`/console/accounts/${id}/unsuspend`), onSettled: done }),
  }
}

/** What a member reads when a suspension or its end fails. */
export function accountFailure(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code === 'account_is_system') return 'Đây là tài khoản ShopNexus, không khoá được.'
    if (e.status === 409) return 'Tài khoản đã đổi trạng thái. Đã tải lại.'
    if (e.status === 422 || e.status === 400) return 'Lý do chưa hợp lệ.'
  }
  return 'Chưa làm được. Thử lại.'
}

/** Accounts matching an id, an email or a phone number exactly; nothing for an empty query. */
export function useAccountSearch(q: string) {
  return useQuery({
    queryKey: ['console', 'accounts', q],
    queryFn: () => api<Page<Account>>(`/console/accounts?q=${encodeURIComponent(q)}&limit=5`),
    enabled: q !== '',
  })
}

/** One account by id, through the same exact search. */
export function useAccount(id: string | undefined) {
  return useQuery({
    queryKey: ['console', 'accounts', id],
    queryFn: () => api<Page<Account>>(`/console/accounts?q=${encodeURIComponent(id!)}&limit=5`),
    enabled: !!id,
    select: (p) => p.items.find((a) => a.id === id),
  })
}

// The accounts a member opened last, kept in this browser and shared by the
// nav's search, Trang chủ and the agent's + menu.
const recentKey = 'console-recent-accounts'
const changed = 'console-recent-accounts'

export type RecentAccount = Account & { opened: string }

let cache: RecentAccount[] | null = null

function read(): RecentAccount[] {
  if (cache) return cache
  try {
    cache = JSON.parse(localStorage.getItem(recentKey) ?? '[]') as RecentAccount[]
  } catch {
    cache = []
  }
  return cache
}

/** Puts an account first in the recent list. */
export function rememberAccount(a: Account) {
  cache = [{ ...a, opened: new Date().toISOString() }, ...read().filter((r) => r.id !== a.id)].slice(0, 8)
  try {
    localStorage.setItem(recentKey, JSON.stringify(cache))
  } catch {
    // Without storage the list lasts the page.
  }
  window.dispatchEvent(new Event(changed))
}

function subscribe(onChange: () => void) {
  window.addEventListener(changed, onChange)
  return () => window.removeEventListener(changed, onChange)
}

export function useRecentAccounts(): RecentAccount[] {
  return useSyncExternalStore(subscribe, read)
}
