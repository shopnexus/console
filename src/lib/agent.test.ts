import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './api'
import { ask, dayGroup, failureOf, maxQuestion } from './agent'

function reply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

const refusal = (status: number, code: string) => reply(status, { error: { code, message: code } })

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('failureOf', () => {
  it.each([
    [504, 'agent_timeout', 'timeout'],
    [429, 'agent_budget', 'budget'],
    [429, 'agent_rate_limited', 'rate_limited'],
    [503, 'agent_unavailable', 'unavailable'],
    [409, 'agent_turn_in_progress', 'busy'],
    [409, 'agent_conversation_closed', 'closed'],
    [422, 'agent_input_rejected', 'too_long'],
    [404, 'agent_conversation_not_found', 'not_found'],
    [500, 'internal', 'other'],
  ])('maps %i %s to %s', (status, code, failure) => {
    expect(failureOf(new ApiError(status, code, code))).toBe(failure)
  })

  it('reads a gateway answer without our body by its status', () => {
    expect(failureOf(new ApiError(504, 'unknown', 'Gateway Timeout'))).toBe('timeout')
    expect(failureOf(new ApiError(502, 'unknown', 'Bad Gateway'))).toBe('unavailable')
  })

  it('maps an abort to aborted', () => {
    expect(failureOf(new DOMException('stopped', 'AbortError'))).toBe('aborted')
  })
})

describe('ask', () => {
  it('posts the question with the console headers and returns the answer', async () => {
    const answer = { conversation_id: 'c1', turn_id: 't1', answer: 'GHTK đã giao.', sources: [{ tool: 'ticket_get', label: 'Ticket', ids: ['x'] }] }
    const fetch = vi.fn(async () => reply(200, answer))
    vi.stubGlobal('fetch', fetch)

    await expect(ask('c1', 'Đơn này giao chưa?')).resolves.toEqual({ ok: true, answer })

    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('http://api.test/v1/console/agent/conversations/c1/turns')
    expect(init.method).toBe('POST')
    expect(init.credentials).toBe('include')
    expect(init.body).toBe(JSON.stringify({ text: 'Đơn này giao chưa?' }))
    expect((init.headers as Record<string, string>)['x-requested-with']).toBe('shopnexus-console')
  })

  it.each([
    [504, 'agent_timeout', 'timeout'],
    [429, 'agent_budget', 'budget'],
    [503, 'agent_unavailable', 'unavailable'],
    [422, 'agent_input_rejected', 'too_long'],
  ])('returns a %i %s as %s without throwing', async (status, code, failure) => {
    vi.stubGlobal('fetch', vi.fn(async () => refusal(status, code)))
    await expect(ask('c1', 'Hỏi')).resolves.toEqual({ ok: false, failure })
  })

  it('refuses a question over the limit without a call', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    await expect(ask('c1', 'a'.repeat(maxQuestion + 1))).resolves.toEqual({ ok: false, failure: 'too_long' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('stops waiting when the member aborts', async () => {
    // A fetch that only ends when its signal aborts, as a slow agent would.
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise<Response>((_, reject) => {
            init.signal?.addEventListener('abort', () => reject(new DOMException('stopped', 'AbortError')))
          }),
      ),
    )
    const controller = new AbortController()
    const out = ask('c1', 'Hỏi', controller.signal)
    controller.abort()
    await expect(out).resolves.toEqual({ ok: false, failure: 'aborted' })
  })

  it('maps a network failure to other', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))))
    await expect(ask('c1', 'Hỏi')).resolves.toEqual({ ok: false, failure: 'other' })
  })
})

describe('dayGroup', () => {
  const now = new Date(2026, 10, 17, 10, 0)
  it.each([
    [new Date(2026, 10, 17, 0, 5), 'Today'],
    [new Date(2026, 10, 16, 23, 59), 'Yesterday'],
    [new Date(2026, 10, 12, 9, 0), 'Previous 7 days'],
    [new Date(2026, 10, 10, 9, 0), 'Previous 7 days'],
    [new Date(2026, 10, 9, 9, 0), 'Older'],
  ])('puts %s in %s', (d, group) => {
    expect(dayGroup(d.toISOString(), now)).toBe(group)
  })
})
