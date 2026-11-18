import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './api'
import { QueryClient } from '@tanstack/react-query'
import { type ConversationDetail, dayGroup, detailKey, failureOf, pendingTurn, postTurn, startTurn, type Turn, variablesOf, withLocalTurns } from './agent'

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
    [404, 'ai_agent_not_found', 'agent_gone'],
    [409, 'ai_agent_disabled', 'agent_off'],
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
    const fetch = vi.fn(async () => reply(202, { conversation_id: 'c1', turn_id: 't1' }))
    vi.stubGlobal('fetch', fetch)

    await expect(
      startTurn('c1', { text: 'Đơn này giao chưa?', agent_id: 'console-assistant', attachments: [{ kind: 'account', id: 'a1', label: 'Account · Hoàng Nam' }] }),
    ).resolves.toEqual({ conversation_id: 'c1', turn_id: 't1' })

    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('http://api.test/v1/console/agent/conversations/c1/turns')
    expect(init.method).toBe('POST')
    expect(init.credentials).toBe('include')
    expect(JSON.parse(String(init.body))).toEqual({ text: 'Đơn này giao chưa?', agent_id: 'console-assistant', attachments: [{ kind: 'account', id: 'a1' }] })
    expect((init.headers as Record<string, string>)['x-requested-with']).toBe('shopnexus-console')
  })

  it('throws the refusal with its code', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => refusal(409, 'ai_agent_disabled')))
    const e = await startTurn('c1', { text: 'x' }).catch((x: unknown) => x)
    expect(e).toMatchObject({ status: 409, code: 'ai_agent_disabled' })
    expect(failureOf(e)).toBe('agent_off')
  })
})

describe('variablesOf', () => {
  it('lists the {{variables}} of a skill prompt once each', () => {
    expect(variablesOf('Brief for {{period}} on {{ sellers }} and {{period}}')).toEqual([{ name: 'period' }, { name: 'sellers' }])
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

describe('a second question in a chat', () => {
  const turn = (id: string, over: Partial<Turn> = {}): Turn => ({ id, member_id: 'm', text: id, status: 'succeeded', blocks: [], sources: [], continuable: false, steers: [], last_seq: 0, created_at: '2026-11-18T10:00:00Z', ...over })
  const chat = (turns: Turn[]): ConversationDetail => ({ id: 'c1', updated_at: '2026-11-18T10:00:00Z', turns })

  it('shows at once, takes its id on the 202 and stays through a read of the conversation', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.method === 'POST') return reply(202, { conversation_id: 'c1', turn_id: 't2' })
        // The event stream and the read again never answer in this test.
        return new Promise<Response>(() => undefined)
      }),
    )
    const client = new QueryClient()
    client.setQueryData(detailKey('c1'), chat([turn('t1')]))
    const pending = pendingTurn('m', { text: 'And suspended ones?' })
    const posting = postTurn(client, 'c1', 'c1', pending, { text: 'And suspended ones?' })
    await Promise.resolve()
    expect(client.getQueryData<ConversationDetail>(detailKey('c1'))!.turns.map((t) => t.text)).toEqual(['t1', 'And suspended ones?'])
    expect(await posting).toBe('t2')
    const after = client.getQueryData<ConversationDetail>(detailKey('c1'))!.turns
    expect(after.map((t) => [t.id, t.status, t.client_key])).toEqual([
      ['t1', 'succeeded', undefined],
      ['t2', 'running', pending.client_key],
    ])

    // A read that began before the post lands without the new turn: the turn stays.
    const stale = withLocalTurns(chat([turn('t1')]), client.getQueryData(detailKey('c1')))
    expect(stale.turns.map((t) => t.id)).toEqual(['t1', 't2'])
    // A later read has it stored: it keeps its client key, so its view is not drawn again.
    const fresh = withLocalTurns(chat([turn('t1'), turn('t2', { status: 'running', text: 'And suspended ones?' })]), client.getQueryData(detailKey('c1')))
    expect(fresh.turns.map((t) => [t.id, t.client_key])).toEqual([
      ['t1', undefined],
      ['t2', pending.client_key],
    ])
  })
})
