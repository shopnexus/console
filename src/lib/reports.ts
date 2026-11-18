import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { type Account, ApiError, api, type Page, post } from './api'

export type ReportReason = 'scam' | 'fake' | 'banned' | 'other'
export type CaseStatus = 'open' | 'resolved'

export const reasonLabel: Record<ReportReason, string> = { scam: 'Scam', fake: 'Fake', banned: 'Banned', other: 'Other' }
/** A reason's dot and pill colours; scam and banned goods are the gravest. */
export const reasonDot: Record<ReportReason, string> = { scam: 'bg-error', fake: 'bg-tertiary', banned: 'bg-on-surface', other: 'bg-outline' }
export const reasonOrder: ReportReason[] = ['scam', 'banned', 'fake', 'other']

export interface ReportedListing {
  id: string
  title: string
  price: number
  status: string
  photo_url?: string
  created_at: string
}

export interface Resolution {
  outcome: 'dismissed' | 'actioned'
  at: string
  by: { member_id: string; display_name: string }
}

export type Reasons = Partial<Record<ReportReason, number>>

export interface ReportCase {
  account: Account
  reports: number
  reasons: Reasons
  listing?: ReportedListing
  first_at: string
  last_at: string
  resolution?: Resolution
}

export interface CaseReport {
  id: string
  reporter: { id: string; display_name: string }
  reason: ReportReason
  note: string
  listing_id?: string
  conversation_id?: string
  created_at: string
}

export interface ReportCaseDetail {
  account: Account
  reasons: Reasons
  first_at: string
  last_at: string
  resolution?: Resolution
  listings: ReportedListing[]
  reports: CaseReport[]
}

/** The reasons of a case, gravest first, with their counts. */
export function reasonsOf(r: Reasons): [ReportReason, number][] {
  return reasonOrder.filter((k) => (r[k] ?? 0) > 0).map((k) => [k, r[k]!])
}

/** Reports' queue: open cases newest report first, or resolved ones newest resolution first. */
export function useCases(status: CaseStatus) {
  const query = useInfiniteQuery({
    queryKey: ['console', 'reports', 'list', status],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => {
      const q = new URLSearchParams({ status, limit: '50', ...(pageParam ? { cursor: pageParam } : {}) })
      return api<Page<ReportCase>>(`/console/reports?${q}`)
    },
    getNextPageParam: (last) => last.next_cursor,
    refetchOnWindowFocus: true,
  })
  const items = useMemo(() => query.data?.pages.flatMap((p) => p.items), [query.data])
  return { ...query, items, total: query.data?.pages[0]?.total }
}

/** An account's open case, or its latest resolved one. */
export function useCase(accountId: string | undefined) {
  return useQuery({
    queryKey: ['console', 'reports', 'detail', accountId],
    queryFn: () => api<ReportCaseDetail>(`/console/reports/${accountId}`),
    enabled: !!accountId,
    retry: (n, e) => !(e instanceof ApiError && e.status === 404) && n < 1,
  })
}

export interface Decision {
  hide: string[]
  suspend?: { reason: string; until?: string }
}

/** Hides the ticked listings, then suspends, then marks the case actioned. */
export async function carryOut(accountId: string, d: Decision): Promise<ReportCaseDetail> {
  for (const id of d.hide) await post(`/console/listings/${id}/hide`)
  if (d.suspend) await post(`/console/accounts/${accountId}/suspend`, d.suspend)
  return post<ReportCaseDetail>(`/console/reports/${accountId}/resolve`)
}

/** Restores what an actioned case hid and the suspension, then reopens the case. */
export async function undoCase(c: ReportCaseDetail): Promise<ReportCaseDetail> {
  const id = c.account.id
  if (c.resolution?.outcome === 'actioned') {
    for (const l of c.listings) {
      if (l.status !== 'hidden') continue
      // A listing its seller hid, which no member held, has nothing to restore.
      await post(`/console/listings/${l.id}/unhide`).catch((e) => {
        if (!(e instanceof ApiError && e.code === 'listing_state_conflict')) throw e
      })
    }
    if (c.account.status === 'suspended') await post(`/console/accounts/${id}/unsuspend`)
  }
  return post<ReportCaseDetail>(`/console/reports/${id}/reopen`)
}

/**
 * What a member does with a case: decide (carryOut), dismiss, undo
 * (undoCase). Each step is its own audited call, so a failure part way
 * leaves the steps before it done; every report and account query reads
 * again either way.
 */
export function useCaseCommands(accountId: string) {
  const client = useQueryClient()
  const done = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ['console', 'reports'] }),
      client.invalidateQueries({ queryKey: ['console', 'accounts'] }),
    ])
  return {
    decide: useMutation({ mutationFn: (d: Decision) => carryOut(accountId, d), onSettled: done }),
    dismiss: useMutation({ mutationFn: () => post<ReportCaseDetail>(`/console/reports/${accountId}/dismiss`), onSettled: done }),
    undo: useMutation({ mutationFn: undoCase, onSettled: done }),
  }
}

/** What a member reads when a step on a case fails. */
export function caseFailure(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code === 'report_case_not_open') return 'This case was already resolved and was read again.'
    if (e.code === 'report_case_not_resolved') return 'This case is not resolved.'
    if (e.code === 'account_is_system') return 'This is a ShopNexus account.'
    if (e.status === 409) return 'The status changed and was read again.'
  }
  return 'Not all of it went through. Try again.'
}
