import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './api'
import { dayGroup, failureOf, startTurn, variablesOf } from './agent'

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

describe('startTurn', () => {
  it('posts the question with the agent and attachments and returns the turn id', async () => {
    const fetch = vi.fn(async () => reply(202, { turn_id: 't1' }))
    vi.stubGlobal('fetch', fetch)

    await expect(
      startTurn('c1', { text: 'Đơn này giao chưa?', agent_id: 'console-assistant', attachments: [{ kind: 'account', id: 'a1', label: 'Account · Hoàng Nam' }] }),
    ).resolves.toEqual({ turn_id: 't1' })

    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('http://api.test/v1/console/agent/conversations/c1/turns')
    expect(init.method).toBe('POST')
    expect(init.credentials).toBe('include')
    expect(JSON.parse(String(init.body))).toEqual({ text: 'Đơn này giao chưa?', agent_id: 'console-assistant', attachments: [{ kind: 'account', id: 'a1' }] })
    expect((init.headers as Record<string, string>)['x-requested-with']).toBe('shopnexus-console')
  })

  it('throws the refusal with its code', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => refusal(409, 'agent_turn_in_progress')))
    await expect(startTurn('c1', { text: 'x' })).rejects.toMatchObject({ status: 409, code: 'agent_turn_in_progress' })
  })
})

describe('variablesOf', () => {
  it('lists the {{variables}} of a skill prompt once each', () => {
    expect(variablesOf('Brief for {{period}} on {{ sellers }} and {{period}}')).toEqual(['period', 'sellers'])
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
