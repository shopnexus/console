import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './api'
import { QueryClient } from '@tanstack/react-query'
import {
  askHref,
  attachmentFromParams,
  type ConversationDetail,
  dayGroup,
  detailKey,
  failureOf,
  pendingTurn,
  postTurn,
  putTurn,
  runOf,
  seedTurn,
  sendTurn,
  startTurn,
  type Turn,
  variablesOf,
  withLocalTurns,
} from './agent'

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
  it('posts the question with the agent and attachments, labels included, and returns the turn id', async () => {
    const fetch = vi.fn(async () => reply(202, { conversation_id: 'c1', turn_id: 't1' }))
    vi.stubGlobal('fetch', fetch)

    await expect(
      startTurn('c1', { text: 'Đơn này giao chưa?', agent_id: 'console-assistant', attachments: [{ kind: 'account', id: 'a1', label: 'Account · Hoàng Nam' }] }),
    ).resolves.toEqual({ conversation_id: 'c1', turn_id: 't1' })

    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('http://api.test/v1/console/agent/conversations/c1/turns')
    expect(init.method).toBe('POST')
    expect(init.credentials).toBe('include')
    expect(JSON.parse(String(init.body))).toEqual({ text: 'Đơn này giao chưa?', agent_id: 'console-assistant', attachments: [{ kind: 'account', id: 'a1', label: 'Account · Hoàng Nam' }] })
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

describe('a finished turn opened again', () => {
  it('replays its events, so the steps, the time and the follow-ups come back', async () => {
    const at = (sec: number) => new Date(Date.UTC(2026, 10, 19, 9, 0, sec)).toISOString()
    const events = [
      { seq: 1, at: at(0), type: 'turn.started', agent: { id: 'a', name: 'Console assistant' }, model: 'm', deadline_s: 60 },
      { seq: 2, at: at(1), type: 'tool.started', call_id: 'c1', tool: 'accounts_count', label: 'accounts' },
      { seq: 3, at: at(2), type: 'tool.finished', call_id: 'c1', status: 'success', duration_ms: 40 },
      { seq: 4, at: at(3), type: 'usage', input_tokens: 900, output_tokens: 100, cost_usd: 0.02, provider: 'p' },
      { seq: 5, at: at(4), type: 'block', block: { type: 'text', markdown: 'None yet.' } },
      { seq: 6, at: at(4), type: 'block', block: { type: 'follow_ups', items: ['How many tickets are open?'] } },
      { seq: 7, at: at(9), type: 'turn.finished', status: 'SUCCEEDED', continuable: false },
    ]
    const sse = events.map((e) => `id: ${e.seq}\ndata: ${JSON.stringify(e)}\n\n`).join('')
    const fetch = vi.fn(async () => new Response(sse, { status: 200, headers: { 'content-type': 'text/event-stream' } }))
    vi.stubGlobal('fetch', fetch)
    const turn: Turn = {
      id: 'replayed-1', member_id: 'me', text: 'How many accounts?', answer: 'None yet.', status: 'succeeded',
      blocks: [{ type: 'text', markdown: 'None yet.' }], sources: [], continuable: false, steers: [], last_seq: 7, created_at: at(0),
      usage: { input_tokens: 900, output_tokens: 100, cost_usd: 0.02 },
    }
    seedTurn(turn)
    expect(runOf(turn.id)?.toolOrder).toEqual([])
    await vi.waitFor(() => expect(runOf(turn.id)?.toolOrder).toEqual(['c1']))
    const run = runOf(turn.id)!
    expect(String((fetch.mock.calls[0] as unknown as [string])[0])).toContain('/console/agent/turns/replayed-1/events')
    expect(run.phase).toBe('finished')
    expect(run.finishedAt).toBe(at(9))
    expect(run.usage).toMatchObject({ input: 900, output: 100, costUsd: 0.02 })
    expect(run.blocks.map((b) => b.type)).toEqual(['text', 'follow_ups'])
  })
})

describe('asking the agent about a record', () => {
  it('links to a new chat with the record attached, which the chat reads back', () => {
    const href = askHref('order', 'o1', 'Order SN-1042')
    expect(href).toBe('/?attach=order%3Ao1&label=Order+SN-1042')
    expect(attachmentFromParams(new URL(href, 'http://x').searchParams)).toEqual({ kind: 'order', id: 'o1', label: 'Order SN-1042' })
  })
  it('attaches nothing for a kind a link cannot carry', () => {
    expect(attachmentFromParams(new URLSearchParams('attach=account:a1'))).toBeUndefined()
    expect(attachmentFromParams(new URLSearchParams())).toBeUndefined()
  })
})

describe('a new chat', () => {
  // POSTs answer from the queue in order; the event stream and the read again never answer.
  function server(...posts: Response[]) {
    const fetch = vi.fn(async (_url: string, init?: RequestInit) => (init?.method === 'POST' ? posts.shift()! : new Promise<Response>(() => undefined)))
    vi.stubGlobal('fetch', fetch)
    return fetch
  }
  const posted = (fetch: ReturnType<typeof server>) => fetch.mock.calls.filter(([, init]) => init?.method === 'POST').map(([url]) => String(url).replace('http://api.test/v1', ''))

  it('makes the conversation, posts the turn and moves to the real id', async () => {
    const fetch = server(reply(201, { id: 'c9', updated_at: '' }), reply(202, { conversation_id: 'c9', turn_id: 't1' }))
    const client = new QueryClient()
    const pending = pendingTurn('m', { text: 'Hi' })
    putTurn(client, 'new-1', pending)
    const ready = vi.fn()
    await sendTurn(client, 'new-1', pending, { text: 'Hi' }, ready)
    expect(posted(fetch)).toEqual(['/console/agent/conversations', '/console/agent/conversations/c9/turns'])
    expect(ready).toHaveBeenCalledWith('c9')
    expect(client.getQueryData<ConversationDetail>(detailKey('c9'))!.turns.map((t) => t.id)).toEqual(['t1'])
    expect(client.getQueryData(detailKey('new-1'))).toBeUndefined()
  })

  it('keeps a refused turn under the temporary id, and Retry posts to the conversation it made', async () => {
    const fetch = server(reply(201, { id: 'c9', updated_at: '' }), refusal(429, 'rate_limited'), reply(202, { conversation_id: 'c9', turn_id: 't1' }))
    const client = new QueryClient()
    const pending = pendingTurn('m', { text: 'Hi' })
    putTurn(client, 'new-1', pending)
    const ready = vi.fn()
    await sendTurn(client, 'new-1', pending, { text: 'Hi' }, ready)
    expect(ready).not.toHaveBeenCalled()
    const temp = client.getQueryData<ConversationDetail>(detailKey('new-1'))!
    expect(temp.real_id).toBe('c9')
    expect(temp.turns[0].failed).toBeTruthy()

    await sendTurn(client, 'new-1', pending, { text: 'Hi' }, ready)
    expect(posted(fetch)).toEqual(['/console/agent/conversations', '/console/agent/conversations/c9/turns', '/console/agent/conversations/c9/turns'])
    expect(ready).toHaveBeenCalledWith('c9')
    expect(client.getQueryData<ConversationDetail>(detailKey('c9'))!.real_id).toBeUndefined()
  })

  it('throws a refusal in a chat that exists, for the caller to steer instead', async () => {
    server(refusal(409, 'agent_busy'))
    const client = new QueryClient()
    const pending = pendingTurn('m', { text: 'Hi' })
    const e = await sendTurn(client, 'c1', pending, { text: 'Hi' }, () => undefined).catch((x: unknown) => x)
    expect(e).toBeInstanceOf(ApiError)
  })
})
