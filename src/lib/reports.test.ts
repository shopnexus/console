import { afterEach, describe, expect, it, vi } from 'vitest'
import { carryOut, reasonsOf, type ReportCaseDetail, undoCase } from './reports'

function reply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

/** Records each call as "METHOD path" and answers 200, or the status (and code) given for a path. */
function server(fail: Record<string, number | [number, string]> = {}) {
  const calls: string[] = []
  const fetch = vi.fn(async (url: string, init?: RequestInit) => {
    const path = new URL(url).pathname.replace('/v1', '')
    calls.push(`${init?.method ?? 'GET'} ${path}${init?.body ? ` ${init.body}` : ''}`)
    const f = fail[path]
    const [status, code] = Array.isArray(f) ? f : [f, 'x']
    return status ? reply(status, { error: { code, message: code } }) : reply(200, {})
  })
  vi.stubGlobal('fetch', fetch)
  return calls
}

afterEach(() => vi.unstubAllGlobals())

const detail = (over: Partial<ReportCaseDetail> = {}): ReportCaseDetail => ({
  account: { id: 'a1', display_name: 'Trần Đức Anh', status: 'suspended', created_at: '2026-11-13T00:00:00Z' },
  reasons: { scam: 4 },
  first_at: '2026-11-16T14:00:00Z',
  last_at: '2026-11-17T02:00:00Z',
  resolution: { outcome: 'actioned', at: '2026-11-17T03:05:00Z', by: { member_id: 'm1', display_name: 'Lan' } },
  listings: [
    { id: 'l1', title: 'iPhone', price: 6_500_000, status: 'hidden', created_at: '2026-11-14T00:00:00Z' },
    { id: 'l2', title: 'AirPods', price: 900_000, status: 'active', created_at: '2026-11-14T00:00:00Z' },
  ],
  reports: [],
  ...over,
})

describe('carryOut', () => {
  it('hides, then suspends, then resolves', async () => {
    const calls = server()
    await carryOut('a1', { hide: ['l1', 'l2'], suspend: { reason: 'Lừa cọc', until: '2026-11-24T00:00:00.000Z' } })
    expect(calls).toEqual([
      'POST /console/listings/l1/hide',
      'POST /console/listings/l2/hide',
      'POST /console/accounts/a1/suspend {"reason":"Lừa cọc","until":"2026-11-24T00:00:00.000Z"}',
      'POST /console/reports/a1/resolve',
    ])
  })

  it('stops at the first failure and leaves the case open', async () => {
    const calls = server({ '/console/listings/l2/hide': 409 })
    await expect(carryOut('a1', { hide: ['l1', 'l2'], suspend: { reason: 'x' } })).rejects.toThrow()
    expect(calls).toEqual(['POST /console/listings/l1/hide', 'POST /console/listings/l2/hide'])
  })
})

describe('undoCase', () => {
  it('restores the hidden listings and the suspension, then reopens', async () => {
    const calls = server()
    await undoCase(detail())
    expect(calls).toEqual(['POST /console/listings/l1/unhide', 'POST /console/accounts/a1/unsuspend', 'POST /console/reports/a1/reopen'])
  })

  it('passes over a listing its seller hid, which no member held', async () => {
    const calls = server({ '/console/listings/l1/unhide': [409, 'listing_state_conflict'] })
    await undoCase(detail())
    expect(calls).toEqual(['POST /console/listings/l1/unhide', 'POST /console/accounts/a1/unsuspend', 'POST /console/reports/a1/reopen'])
  })

  it('only reopens a dismissed case', async () => {
    const calls = server()
    await undoCase(detail({ resolution: { outcome: 'dismissed', at: '2026-11-17T03:05:00Z', by: { member_id: 'm1', display_name: 'Lan' } } }))
    expect(calls).toEqual(['POST /console/reports/a1/reopen'])
  })
})

describe('reasonsOf', () => {
  it('lists the reasons gravest first and skips the empty ones', () => {
    expect(reasonsOf({ other: 1, fake: 2, scam: 4, banned: 0 })).toEqual([
      ['scam', 4],
      ['fake', 2],
      ['other', 1],
    ])
  })
})
