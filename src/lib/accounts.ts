import { useQuery } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'
import { type Account, api, type Page } from './api'

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
