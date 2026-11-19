import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'
import { type Account, type Action, ApiError, api, noRetryOn404, type Page, post } from './api'
import { usePaged } from './paged'
import { DAY, count } from './format'

export type AccountTab = 'all' | 'suspended'

/** The terms a member may suspend for, in days; null has no end. */
export const suspendTerms: [number | null, string][] = [
  [1, '1 day'],
  [7, '7 days'],
  [30, '30 days'],
  [null, 'No end'],
]

/** "7 days", or "with no end". */
export const termLabel = (days: number | null) => (days === null ? 'with no end' : count(days, 'day'))

/** The end of a term that starts now, as the server takes it. */
export const untilOf = (days: number | null, now: number) => (days === null ? undefined : new Date(now + days * DAY).toISOString())

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

/** Accounts' list: every account newest first, or the suspended ones, the term that ends first first. */
export const useAccountList = (tab: AccountTab) =>
  usePaged<Account>(['console', 'accounts', 'list', tab], '/console/accounts', { status: tab === 'suspended' ? 'suspended' : undefined })

/** An account with its identities and the console's actions on it. */
export function useAccountDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['console', 'accounts', 'detail', id],
    queryFn: () => api<AccountDetail>(`/console/accounts/${id}`),
    enabled: !!id,
    retry: noRetryOn404,
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
    if (e.code === 'account_is_system') return 'This is a ShopNexus account and cannot be suspended.'
    if (e.status === 409) return 'The account changed status and was read again.'
    if (e.status === 422 || e.status === 400) return 'The reason is not valid.'
  }
  return 'That did not go through. Try again.'
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
// sidebar's search and the ask box's + menu.
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
