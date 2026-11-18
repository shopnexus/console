import type { AgentDocument, Attachment, Conversation, ConversationDetail, Skill, ToolCallDetail, Turn } from '../agent'
import { type Block, replay, type RunEvent, type Source } from '../run'
import { ids } from './settings'
import { MockError, type Route } from '.'

// The agent's chats and runs behind VITE_MOCK_AI=1: a scripted run taken
// from the soft-chat-run and soft-chat-done mockups, with pause, stop,
// continue, steer, clarifying questions, a retry and a spent budget. Runs
// keep their events, so a stream opened again replays after Last-Event-ID.

type Body = { [K in RunEvent['type']]: Omit<Extract<RunEvent, { type: K }>, 'seq' | 'at'> }[RunEvent['type']]

/** A beat of a script: wait, then emit. A boundary is a model call, where pause and steers take effect. */
interface Beat {
  wait: number
  events: Body[]
  boundary?: boolean
  /** The run stops here until the member answers. */
  ask?: boolean
}

interface MockTurn {
  id: string
  conversationId: string
  events: RunEvent[]
  script: Beat[]
  at: number
  timer?: ReturnType<typeof setTimeout>
  pausing: boolean
  halted: boolean
  steers: string[]
  stepsDone: number
  wake: Set<() => void>
  /** A seeded turn's clock: its beats are spread out in the past instead of now. */
  virtual?: number
}

const turns = new Map<string, MockTurn>()
/** A conversation as stored: its asks, each with the turn that answers it. */
interface MockConversation extends Conversation {
  asks: { turnId: string; member_id: string; text: string; created_at: string; attachments?: Attachment[]; skill_id?: string; agent_id?: string }[]
}

const conversations = new Map<string, MockConversation>()

const viewStatus: Record<string, Turn['status']> = { SUCCEEDED: 'succeeded', FAILED: 'failed', CANCELLED: 'cancelled', TIMED_OUT: 'timed_out', BUDGET: 'budget' }

/** The server's turn view (AgentTurn) of a mock turn, from its events. */
function viewOf(t: MockTurn, ask: MockConversation['asks'][number]): Turn {
  const run = replay(t.events)
  const phase = phaseOf(t)
  const end = [...t.events].reverse().find((e) => e.type === 'turn.finished') as Extract<RunEvent, { type: 'turn.finished' }> | undefined
  const text = run.blocks.find((b) => b.type === 'text') as { markdown: string } | undefined
  return {
    id: t.id,
    conversation_id: t.conversationId,
    member_id: ask.member_id,
    text: ask.text,
    answer: text?.markdown,
    status: phase === 'finished' ? (viewStatus[end?.status ?? 'FAILED'] ?? 'failed') : phase === 'awaiting' ? 'awaiting_input' : phase,
    blocks: run.blocks,
    sources: run.sources,
    outcome: end?.outcome ?? undefined,
    error_code: end?.failure,
    continuable: end ? end.continuable : phase === 'paused',
    agent: run.agent,
    usage: run.usage.input ? { input_tokens: run.usage.input, output_tokens: run.usage.output, cost_usd: run.usage.costUsd, first_token_ms: run.firstTokenMs, provider: run.provider } : undefined,
    steers: run.steers.filter((x) => x.text).map((x) => ({ steer_id: x.id, text: x.text })),
    questions: run.clarify,
    last_seq: t.events.length,
    created_at: ask.created_at,
    attachments: ask.attachments,
    skill_id: ask.skill_id,
    agent_id: ask.agent_id,
  }
}

function detailOf(c: MockConversation): ConversationDetail {
  return { id: c.id, title: c.title, updated_at: c.updated_at, subject_kind: c.subject_kind, subject_id: c.subject_id, turns: c.asks.map((a) => viewOf(turns.get(a.turnId)!, a)) }
}

const SOURCES: Source[] = [
  { n: 1, kind: 'data', label: 'Reports · last 7 days', quote: '86 reports, 66 scam, 23 fake, 8 banned', call_id: 'c-r1' },
  { n: 2, kind: 'report', record_id: 'a1f0c3aa-0000', label: 'Đồ Cũ Gò Vấp', quote: '3 reports · deposit scam · shares pickup address', call_id: 'c-a1' },
  { n: 3, kind: 'account', record_id: '7d22e9aa-0000', label: 'Trần Đức Anh', quote: "4 listings reuse Gò Vấp's photos at 97%", call_id: 'c-a2' },
  { n: 4, kind: 'report', record_id: 'b31f77aa-0000', label: 'Thủ Đức AirPods resellers', quote: '14 reports since Monday, same AirPods photo set', call_id: 'c-l1' },
  { n: 5, kind: 'data', label: 'Report reasons', quote: '“Chuyển cọc trước” in 35 of 86 reports', call_id: 'c-r1' },
  { n: 6, kind: 'account', record_id: 'c90b14aa-0000', label: 'Phạm Quốc Bảo', quote: 'Suspended 30 days · same deposit message', call_id: 'c-a3' },
  { n: 7, kind: 'ticket', record_id: 't1', label: 'Quang Huy · scam', quote: '“Bắt chuyển cọc trước rồi chặn mình”', call_id: 'c-t1' },
  { n: 8, kind: 'log', label: 'Audit log', quote: '2 suspensions in the Gò Vấp ring this week', call_id: 'c-g1' },
  { n: 9, kind: 'account', record_id: 'e5aa0000', label: 'Mỹ Phẩm Xách Tay Hà', quote: 'Hải Châu cosmetics · 1 suspended', call_id: 'c-a4' },
]

const answer: Block[] = [
  {
    type: 'text',
    markdown:
      'Scam reports rose to **86** this week, up 31% [1]. Most of the rise comes from two rings: the Gò Vấp deposit ring, which added 3 accounts [2][3], and a new AirPods reseller group in Thủ Đức [4]. Asking for a deposit first now shows up in 41% of reports [5].',
  },
  {
    type: 'figures',
    items: [
      { value: '86', label: 'reports', change: '+31% vs last week', tone: 'bad' },
      { value: '2', label: 'rings growing', change: '+3 accounts', tone: 'neutral' },
      { value: '41%', label: 'ask for a deposit', change: '+12 pts', tone: 'bad' },
      { value: '6.2 h', label: 'median to resolve', change: '−1.4 h', tone: 'good' },
    ],
  },
  {
    type: 'chart',
    kind: 'stacked_bar',
    title: 'Reports per day',
    labels: ['Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed'],
    series: [
      { name: 'Scam', values: [9, 11, 8, 7, 14, 16, 21] },
      { name: 'Fake', values: [3, 2, 4, 2, 3, 5, 4] },
      { name: 'Banned', values: [1, 1, 0, 1, 2, 1, 2] },
    ],
  },
  {
    type: 'table',
    columns: ['Ring', 'Accounts', 'Reports', 'vs last week', 'Status'],
    rows: [
      ['Gò Vấp deposit ring', 5, 23, '+9', '2 suspended'],
      ['Thủ Đức AirPods resellers', 3, 14, 'New', 'None yet'],
      ['Hải Châu cosmetics', 4, 9, '−2', '1 suspended'],
    ],
  },
  { type: 'document_ref', document_id: 'doc-brief', version: 2, title: 'Weekly scam brief · Nov 12–18', sections: 4 },
  { type: 'follow_ups', items: ['Draft suspensions for Thủ Đức', 'Compare with October', 'Sellers that appear in two rings'] },
  { type: 'sources', items: SOURCES },
]

const usage = (i: number, o: number): Body => ({ type: 'usage', input_tokens: i, output_tokens: o, cost_usd: (i * 2 + o * 10) / 1_000_000, provider: 'LLM upstream' })

function briefScript(agent: { id: string; name: string }, variant: 'run' | 'retry' | 'budget'): Beat[] {
  const tool = (id: string, step: string, name: string, label: string, input: unknown): Body => ({ type: 'tool.started', call_id: id, step_id: step, tool: name, label, input })
  const done = (id: string, ms: number, summary: string, sources: number[] = []): Body => ({
    type: 'tool.finished',
    call_id: id,
    status: 'success',
    duration_ms: ms,
    timing: { queued: 2, server: Math.round(ms * 0.8), db: Math.round(ms * 0.55), return: 5 },
    result_summary: summary,
    source_ids: sources,
  })
  const beats: Beat[] = [
    { wait: 300, events: [{ type: 'turn.started', agent, model: 'Claude Sonnet 5.5', deadline_s: 300 }, { type: 'context.meter', used_tokens: 18_400, window_tokens: 200_000 }] },
    { wait: 500, boundary: true, events: [{ type: 'step.started', step_id: 's1', title: 'Plan' }] },
    { wait: 800, events: [{ type: 'thinking', summary: 'Weighted rings by new accounts rather than raw report counts, since one buyer filed 5 reports against Hải Châu.', duration_ms: 6000 }, { type: 'step.finished', step_id: 's1', summary: "Split into this week's reports, links between accounts, and the change against last week.", duration_ms: 800 }, usage(4200, 180)] },
    { wait: 400, boundary: true, events: [{ type: 'step.started', step_id: 's2', title: 'Read reports' }, tool('c-r1', 's2', 'report_cases_list', 'last 7 days', { status: 'open', days: 7 }), tool('c-r2', 's2', 'report_cases_list', '7 days before', { status: 'all', from_days: 14, to_days: 7 })] },
    { wait: 900, events: [done('c-r1', 38, '86', [1, 5]), done('c-r2', 41, '66')] },
    {
      wait: 500,
      events: [
        { type: 'model.switched', from_provider: 'LLM upstream', to_provider: 'Anthropic', reason: '529 overloaded' },
        { type: 'step.finished', step_id: 's2', summary: '86 reports this week, 66 the week before. 66 are scams.', duration_ms: 2100 },
        usage(6100, 240),
      ],
    },
    {
      wait: 400,
      boundary: true,
      events: [
        { type: 'step.started', step_id: 's3', title: 'Look up the reported accounts' },
        tool('c-a1', 's3', 'account_get', 'Đồ Cũ Gò Vấp', { id: 'a1f0c3aa' }),
        tool('c-a2', 's3', 'account_get', 'Trần Đức Anh', { id: '7d22e9aa', include: ['profile', 'listings', 'reports', 'photo_matches'] }),
        tool('c-a3', 's3', 'account_get', 'Phạm Quốc Bảo', { id: 'c90b14aa' }),
        tool('c-a4', 's3', 'account_get', 'Mỹ Phẩm Hà', { id: 'e5aa0000' }),
        tool('c-a5', 's3', 'account_get', 'Hoàng Nam', { id: '5e8a0100' }),
      ],
    },
    { wait: 1100, events: [done('c-a1', 42, 'active', [2]), done('c-a2', 38, '4 photo matches', [3]), done('c-a3', 36, 'suspended', [6]), done('c-a4', 40, 'active', [9]), done('c-a5', 35, 'active')] },
    {
      wait: 500,
      events: [
        tool('c-g1', 's3', 'console_actions', 'Gò Vấp ring', { target_ids: ['a1f0c3aa', '7d22e9aa'] }),
        tool('c-t1', 's3', 'tickets_of_account', 'Đồ Cũ Gò Vấp', { id: 'a1f0c3aa' }),
      ],
    },
    {
      wait: 700,
      events: [
        done('c-g1', 30, '2 suspensions', [8]),
        done('c-t1', 44, '1 ticket', [7]),
        { type: 'guardrail', rule: 'pii_masked', detail: 'Masked 3 phone numbers' },
        { type: 'step.finished', step_id: 's3', summary: '5 accounts behind the 3 biggest cases; 2 suspended before.', duration_ms: 3400 },
        usage(9800, 310),
        { type: 'context.meter', used_tokens: 61_000, window_tokens: 200_000 },
      ],
    },
    {
      wait: 400,
      boundary: true,
      events: [
        { type: 'step.started', step_id: 's4', title: 'Check the rings' },
        ...Array.from({ length: 4 }, (_, i) => tool(`c-l${i + 1}`, 's4', 'listing_get', `l_88a${i + 1}`, { id: `l_88a${i + 1}` })),
      ],
    },
  ]
  if (variant === 'budget') {
    beats.push(
      { wait: 900, events: [done('c-l1', 37, 'match 97%', [4]), done('c-l2', 39, 'match 96%')] },
      { wait: 400, events: [{ type: 'turn.finished', status: 'BUDGET', outcome: null, continuable: false, sources: SOURCES.slice(0, 4) }] },
    )
    return beats
  }
  beats.push({ wait: 900, events: [done('c-l1', 37, 'match 97%', [4]), done('c-l2', 39, 'match 96%'), done('c-l3', 41, 'no match')] })
  if (variant === 'retry') {
    beats.push(
      { wait: 600, events: [{ type: 'tool.retry', call_id: 'c-l4', attempt: 1, error: 'Timed out after 10 s', next_in_ms: 2000, timeout_ms: 10_000 }] },
      { wait: 1400, events: [{ type: 'tool.retry', call_id: 'c-l4', attempt: 2, error: 'Timed out after 10 s', next_in_ms: 4000, timeout_ms: 20_000 }] },
      { wait: 1600, events: [{ type: 'rate.waiting', until: new Date(Date.now() + 20_000).toISOString() }] },
      { wait: 2500, events: [done('c-l4', 1800, 'match 91%')] },
    )
  } else {
    beats.push({ wait: 700, events: [done('c-l4', 44, 'match 91%')] })
  }
  beats.push(
    {
      wait: 400,
      events: [{ type: 'step.finished', step_id: 's4', summary: 'Gò Vấp grew to 5 accounts; a new AirPods group in Thủ Đức.', duration_ms: 21_000 }, usage(14_200, 420)],
    },
    { wait: 300, events: [{ type: 'context.compacting' }] },
    { wait: 600, events: [{ type: 'context.compacted', summary: 'Earlier in this chat: the Gò Vấp ring was found on Monday; Lan suspended Đồ Cũ Gò Vấp for 30 days.', before_tokens: 168_000, after_tokens: 52_000 }] },
    { wait: 300, boundary: true, events: [{ type: 'step.started', step_id: 's5', title: 'Write the brief' }] },
    ...'Scam reports rose to 86 this week, up 31%. Most of the rise comes from two rings: the Gò Vấp deposit ring and a new AirPods reseller group in Thủ Đức.'
      .split(/(?<=[ ,.])/)
      .reduce<string[][]>((acc, w, i) => {
        if (i % 4 === 0) acc.push([])
        acc[acc.length - 1].push(w)
        return acc
      }, [])
      .map((ws) => ({ wait: 160, events: [{ type: 'text.delta', delta: ws.join('') } as Body] })),
    { wait: 500, events: [...answer.map((block) => ({ type: 'block', block }) as Body), { type: 'step.finished', step_id: 's5', summary: '4 sections, 9 sources cited.', duration_ms: 14_000 }, { ...usage(18_402 - 14_200, 1214 - 420), first_token_ms: 1100 } as Body] },
    { wait: 200, events: [{ type: 'context.meter', used_tokens: 74_000, window_tokens: 200_000 }, { type: 'turn.finished', status: 'SUCCEEDED', outcome: null, continuable: false, sources: SOURCES }] },
  )
  return beats
}

function clarifyScript(agent: { id: string; name: string }): Beat[] {
  return [
    { wait: 300, events: [{ type: 'turn.started', agent, model: 'Claude Sonnet 5.5', deadline_s: 300 }] },
    { wait: 700, boundary: true, events: [{ type: 'text.delta', delta: 'Three choices change what goes in the brief.' }] },
    {
      wait: 300,
      ask: true,
      events: [
        {
          type: 'clarify',
          questions: [
            { id: 'period', label: 'Which period?', kind: 'single', default: 'week', options: [{ id: 'week', label: 'Last 7 days', hint: 'Nov 12–18' }, { id: 'month', label: 'This month', hint: 'Nov 1–18' }, { id: '30d', label: 'Last 30 days', hint: 'Oct 20–Nov 18' }] },
            { id: 'sellers', label: 'Which sellers?', kind: 'multi', default: ['reported', 'suspended'], options: [{ id: 'reported', label: 'Reported this week', hint: '38 sellers' }, { id: 'suspended', label: 'Suspended before', hint: '12 sellers' }, { id: 'top', label: 'Top 20 by orders', hint: '20 sellers' }] },
            { id: 'format', label: 'Format', kind: 'single', default: 'document', options: [{ id: 'document', label: 'Document' }, { id: 'table', label: 'Table' }] },
          ],
        },
      ],
    },
    ...briefScript(agent, 'run').slice(1),
  ]
}

// ------------------------------------------------------------- engine --

function push(t: MockTurn, body: Body) {
  const ev = { ...body, seq: t.events.length + 1, at: new Date(t.virtual ?? Date.now()).toISOString() } as RunEvent
  t.events.push(ev)
  if (ev.type === 'step.finished') t.stepsDone += 1
  t.wake.forEach((f) => f())
}

function phaseOf(t: MockTurn): 'running' | 'paused' | 'awaiting' | 'finished' {
  for (let i = t.events.length - 1; i >= 0; i--) {
    const type = t.events[i].type
    if (type === 'turn.finished') return 'finished'
    if (type === 'turn.paused') return 'paused'
    if (type === 'clarify') return 'awaiting'
    if (type === 'turn.resumed') return 'running'
  }
  return 'running'
}

function tick(t: MockTurn, instant = false) {
  if (t.halted || t.at >= t.script.length) return
  const beat = t.script[t.at]
  const run = () => {
    t.timer = undefined
    if (t.halted) return
    if (beat.boundary) {
      if (t.pausing) {
        t.pausing = false
        t.halted = true
        push(t, { type: 'turn.paused', steps_done: t.stepsDone, reason: 'member' })
        return
      }
    }
    for (const e of beat.events) {
      push(t, e)
      // A steer waiting at a model call is read before the step it opens.
      if (e.type === 'step.started') for (const id of t.steers.splice(0)) push(t, { type: 'steer.read', steer_id: id, step_id: e.step_id, step_number: t.events.filter((x) => x.type === 'step.started').length })
    }
    t.at += 1
    if (beat.ask) {
      t.halted = true
      return
    }
    tick(t, instant)
  }
  if (instant) {
    if (t.virtual !== undefined) t.virtual += beat.wait * 4
    run()
  } else t.timer = setTimeout(run, beat.wait)
}

function resume(t: MockTurn, by: 'continue' | 'steer' | 'input') {
  if (phaseOf(t) === 'running' && !t.halted) return
  t.halted = false
  push(t, { type: 'turn.resumed', by })
  tick(t)
}

function newTurn(conversationId: string, text: string, agentId?: string, instant = false, startAt?: number): MockTurn {
  const agent = agentId === ids.brief ? { id: ids.brief, name: 'Weekly brief' } : { id: ids.console, name: 'Console assistant' }
  const q = text.toLowerCase()
  const script = q.includes('budget') ? briefScript(agent, 'budget') : q.startsWith('prepare') ? clarifyScript(agent) : q.includes('retry') || q.includes('slow') ? briefScript(agent, 'retry') : briefScript(agent, 'run')
  const t: MockTurn = { id: crypto.randomUUID(), conversationId, events: [], script, at: 0, pausing: false, halted: false, steers: [], stepsDone: 0, wake: new Set(), virtual: startAt }
  turns.set(t.id, t)
  tick(t, instant)
  return t
}

/** A turn's events after `after`, then each new one, until the run stops for now. */
export async function* mockEvents(id: string, after: number, signal: AbortSignal): AsyncGenerator<RunEvent> {
  const t = turns.get(id)
  if (!t) throw new MockError(404, 'not_found')
  let next = after
  for (;;) {
    while (next < t.events.length) {
      yield t.events[next]
      next += 1
    }
    const phase = phaseOf(t)
    if (phase !== 'running' || signal.aborted) return
    await new Promise<void>((resolve) => {
      const wake = () => {
        t.wake.delete(wake)
        resolve()
      }
      t.wake.add(wake)
      signal.addEventListener('abort', wake)
    })
  }
}

// --------------------------------------------------------------- seeds --

function seed(id: string, title: string, minutesAgo: number, question?: string, subject?: { kind: 'ticket' | 'account'; id: string }) {
  const at = new Date(Date.now() - minutesAgo * 60_000).toISOString()
  const c: MockConversation = { id, title, updated_at: at, asks: [], subject_kind: subject?.kind, subject_id: subject?.id }
  if (question) {
    const t = newTurn(id, question, undefined, true, Date.parse(at))
    t.virtual = undefined
    c.asks.push({ turnId: t.id, member_id: '0193e000-0000-7000-8000-00000000c002', text: question, created_at: at, agent_id: ids.console })
  }
  conversations.set(id, c)
}

seed('g1', 'Weekly scam brief', 12, "Summarize this week's scam reports. Which rings are growing?")
seed('g2', "Khánh Linh's GHTK proof of delivery", 50)
seed('g3', 'Is the Dior 999 lipstick fake', 90)
seed('g4', 'Air gun listings this week', 60 * 26)
seed('g5', 'Lê Thị Hồng reported for scams', 60 * 27)

const skills: Skill[] = [
  { id: 'sk1', name: 'Weekly brief', slug: 'weekly-brief', description: 'Reports, rings and actions for a period', prompt: 'Write the weekly brief for {{period}}.', variables: [{ name: 'period', label: 'Period', default: 'last 7 days' }], created_by: ids.khoa, updated_at: new Date().toISOString() },
  { id: 'sk2', name: 'Ring check', slug: 'ring-check', description: 'Accounts linked by address, photos or messages', prompt: 'Which accounts are linked to {{account}}?', variables: [{ name: 'account', label: 'Account' }], created_by: ids.khoa, updated_at: new Date().toISOString() },
  { id: 'sk3', name: 'Seller profile', slug: 'seller-profile', description: 'Orders, refusals, reports and history', prompt: 'Profile of seller {{account}}.', variables: [{ name: 'account', label: 'Account' }], created_by: ids.khoa, updated_at: new Date().toISOString() },
  { id: 'sk4', name: 'Ticket digest', slug: 'ticket-digest', description: 'Open tickets grouped by cause', prompt: 'Group the open tickets by cause.', variables: [], created_by: ids.khoa, updated_at: new Date().toISOString() },
  { id: 'sk5', name: 'Carrier report', slug: 'carrier-report', description: 'Delivery disputes by carrier and hub', prompt: 'Delivery disputes by carrier and hub for {{period}}.', variables: [{ name: 'period', label: 'Period', default: 'last 7 days' }], created_by: ids.khoa, updated_at: new Date().toISOString() },
]

const briefSections = [
  {
    type: 'markdown' as const,
    markdown:
      '# Scam reports, Nov 12–18\n\n## Summary\n\n- 86 reports, up 31%; scam is 77% of them [1].\n- The Gò Vấp deposit ring grew to 5 accounts [2][3].\n- A new AirPods reseller group in Thủ Đức filed 14 reports since Monday [4].\n- Median time to resolve fell to 6.2 hours [8].',
  },
  answer[2] as Extract<Block, { type: 'chart' }>,
  { type: 'markdown' as const, markdown: '## Next steps\n\n1. Review suspensions for 3 Thủ Đức accounts.\n2. Block the AirPods photo set in new listings.\n3. Warn buyers in chat about deposits.' },
]

const document: AgentDocument = {
  id: 'doc-brief',
  conversation_id: 'g1',
  title: 'Weekly scam brief',
  latest_version: 2,
  created_at: new Date(Date.now() - 20 * 60_000).toISOString(),
  updated_at: new Date(Date.now() - 2 * 60_000).toISOString(),
  versions: [
    { version: 2, title: 'Weekly scam brief', sections: briefSections, created_at: new Date(Date.now() - 2 * 60_000).toISOString() },
    { version: 1, title: 'Weekly scam brief (draft)', sections: [briefSections[0]], created_at: new Date(Date.now() - 20 * 60_000).toISOString() },
  ],
}

function toolResult(call: Extract<RunEvent, { type: 'tool.started' }>): unknown {
  if (call.tool === 'account_get') {
    return {
      id: '7d22e9', name: call.label, status: 'active', listings: 14, reports: { total: 4, scam: 4 }, pickup_address: '41 Lê Văn Thọ, Gò Vấp',
      photo_matches: [{ listing: 'l_88a1', of: 'l_51c0', score: 0.97 }, { listing: 'l_88b4', of: 'l_51c2', score: 0.96 }], suspended_before: false,
    }
  }
  if (call.tool === 'report_cases_list') return { total: call.label === 'last 7 days' ? 86 : 66, by_reason: { scam: 66, fake: 23, banned: 8 } }
  return { id: (call.input as { id?: string } | undefined)?.id ?? call.call_id, ok: true }
}

// -------------------------------------------------------------- routes --

const A = '^/console/agent'

function conversation(id: string): MockConversation {
  const c = conversations.get(id)
  if (!c) throw new MockError(404, 'agent_conversation_not_found')
  return c
}

function turn(id: string) {
  const t = turns.get(id)
  if (!t) throw new MockError(404, 'not_found')
  return t
}

const summary = (c: MockConversation): Conversation => ({ id: c.id, title: c.title, updated_at: c.updated_at, subject_kind: c.subject_kind, subject_id: c.subject_id })

export const agentRoutes: Route[] = [
  [
    'GET',
    new RegExp(`${A}/conversations$`),
    (_, __, q) => ({
      items: [...conversations.values()].filter((c) => (q.get('subject_kind') ?? undefined) === c.subject_kind).map(summary),
    }),
  ],
  [
    'POST',
    new RegExp(`${A}/conversations$`),
    (_, body) => {
      const b = body as { subject_kind?: 'ticket' | 'account'; subject_id?: string }
      const found = b.subject_id && [...conversations.values()].find((c) => c.subject_id === b.subject_id)
      if (found) return summary(found)
      const c: MockConversation = { id: crypto.randomUUID(), updated_at: new Date().toISOString(), asks: [], subject_kind: b.subject_kind, subject_id: b.subject_id }
      conversations.set(c.id, c)
      return summary(c)
    },
  ],
  ['GET', new RegExp(`${A}/conversations/([^/]+)$`), (m) => detailOf(conversation(m[1]))],
  [
    'GET',
    new RegExp(`${A}/turns/([^/]+)$`),
    (m) => {
      const t = turn(m[1])
      const ask = conversations.get(t.conversationId)?.asks.find((a) => a.turnId === t.id)
      if (!ask) throw new MockError(404, 'agent_turn_not_found')
      return viewOf(t, ask)
    },
  ],
  [
    'POST',
    new RegExp(`${A}/conversations/([^/]+)/turns$`),
    (m, body) => {
      const c = conversation(m[1])
      const last = c.asks[c.asks.length - 1]
      const lastTurn = last && turns.get(last.turnId)
      if (lastTurn && phaseOf(lastTurn) !== 'finished') throw new MockError(409, 'agent_turn_in_progress')
      const b = body as { text: string; agent_id?: string; skill_id?: string; attachments?: Attachment[] }
      if (b.agent_id && b.agent_id !== ids.console && b.agent_id !== ids.brief) throw new MockError(404, 'ai_agent_not_found')
      const t = newTurn(c.id, b.text, b.agent_id)
      c.asks.push({ turnId: t.id, member_id: 'me', text: b.text, created_at: new Date().toISOString(), agent_id: b.agent_id, skill_id: b.skill_id, attachments: b.attachments })
      c.title ??= b.text.slice(0, 80)
      c.updated_at = new Date().toISOString()
      return { conversation_id: c.id, turn_id: t.id }
    },
  ],
  [
    'POST',
    new RegExp(`${A}/turns/([^/]+)/pause$`),
    (m) => {
      const t = turn(m[1])
      if (phaseOf(t) !== 'running') throw new MockError(409, 'agent_turn_state')
      if (!t.pausing) {
        t.pausing = true
        push(t, { type: 'turn.pausing', steps_done: t.stepsDone, reason: 'member' })
      }
      return { turn_id: t.id }
    },
  ],
  [
    'POST',
    new RegExp(`${A}/turns/([^/]+)/stop$`),
    (m) => {
      const t = turn(m[1])
      if (phaseOf(t) !== 'running') throw new MockError(409, 'agent_turn_state')
      // Stop now: the call in flight ends and the turn goes paused, keeping what it wrote.
      clearTimeout(t.timer)
      t.halted = true
      t.pausing = false
      push(t, { type: 'turn.paused', steps_done: t.stepsDone, reason: 'stop_now' })
      return { turn_id: t.id }
    },
  ],
  [
    'POST',
    new RegExp(`${A}/turns/([^/]+)/end$`),
    (m) => {
      const t = turn(m[1])
      const phase = phaseOf(t)
      if (phase !== 'paused' && phase !== 'awaiting') throw new MockError(409, 'agent_turn_state')
      clearTimeout(t.timer)
      t.halted = true
      push(t, { type: 'turn.finished', status: 'CANCELLED', outcome: 'stopped', continuable: false })
      return { turn_id: t.id, status: 'cancelled' }
    },
  ],
  [
    'POST',
    new RegExp(`${A}/turns/([^/]+)/continue$`),
    (m) => {
      const t = turn(m[1])
      if (phaseOf(t) !== 'paused') throw new MockError(409, 'agent_turn_state')
      resume(t, 'continue')
      return { turn_id: t.id }
    },
  ],
  [
    'POST',
    new RegExp(`${A}/turns/([^/]+)/steer$`),
    (m, body) => {
      const t = turn(m[1])
      if (phaseOf(t) !== 'running' && phaseOf(t) !== 'paused') throw new MockError(409, 'agent_turn_state')
      void body
      const id = crypto.randomUUID()
      t.steers.push(id)
      const resumed = phaseOf(t) === 'paused'
      if (resumed) resume(t, 'steer')
      return { steer_id: id, turn_id: t.id, resumed }
    },
  ],
  [
    'POST',
    new RegExp(`${A}/turns/([^/]+)/input$`),
    (m) => {
      const t = turn(m[1])
      if (phaseOf(t) !== 'awaiting') throw new MockError(409, 'agent_turn_state')
      resume(t, 'input')
      return { turn_id: t.id }
    },
  ],
  [
    'GET',
    new RegExp(`${A}/tool-calls/([^/]+)$`),
    (m): ToolCallDetail => {
      for (const t of turns.values()) {
        const start = t.events.find((e) => e.type === 'tool.started' && e.call_id === m[1]) as Extract<RunEvent, { type: 'tool.started' }> | undefined
        if (!start) continue
        const end = t.events.find((e) => e.type === 'tool.finished' && e.call_id === m[1]) as Extract<RunEvent, { type: 'tool.finished' }> | undefined
        const retries = t.events.filter((e) => e.type === 'tool.retry' && e.call_id === m[1]) as Extract<RunEvent, { type: 'tool.retry' }>[]
        return {
          id: m[1], turn_id: t.id, tool: start.tool, status: end?.status ?? 'running', input: start.input ?? {}, output: end ? toolResult(start) : undefined, output_spilled: false,
          started_at: start.at, finished_at: end?.at, duration_ms: end?.duration_ms, timing: end?.timing, attempts: retries.length + 1,
        }
      }
      throw new MockError(404, 'agent_tool_call_not_found')
    },
  ],
  [
    'GET',
    new RegExp(`${A}/documents/([^/]+)$`),
    (m) => {
      if (m[1] !== document.id) throw new MockError(404, 'agent_document_not_found')
      return document
    },
  ],
  ['GET', new RegExp(`${A}/skills$`), () => ({ items: skills })],
  [
    'POST',
    new RegExp(`${A}/skills$`),
    (_, body) => {
      const b = body as Partial<Skill> & { name: string; prompt: string }
      const slug = b.slug ?? b.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      if (skills.some((x) => x.slug === slug)) throw new MockError(409, 'agent_skill_taken')
      const s: Skill = { id: crypto.randomUUID(), created_by: ids.khoa, name: b.name, slug, description: b.description ?? '', prompt: b.prompt, variables: b.variables ?? [], updated_at: new Date().toISOString() }
      skills.push(s)
      return s
    },
  ],
  [
    'DELETE',
    new RegExp(`${A}/skills/([^/]+)$`),
    (m) => {
      skills.splice(skills.findIndex((s) => s.id === m[1]), 1)
      return undefined
    },
  ],
]
