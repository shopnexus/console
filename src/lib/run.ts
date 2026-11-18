// A turn as a run: the events the agent streams (spec 2026-11-18, "Events")
// and the pure reducer that builds what the chat shows from them. The
// reducer takes events in seq order and ignores one it has seen, so a
// replay after Last-Event-ID is safe.

export type SourceKind = 'report' | 'account' | 'ticket' | 'order' | 'listing' | 'member' | 'data' | 'log'

/**
 * A record a tool returned, numbered in the order results arrived; the
 * answer's [n] point here. An agent before source labels sends a kind it
 * may not know and a label such as "Record 01a1ef31", with no meta or
 * facts; lib/sources reads it gracefully.
 */
export interface Source {
  n: number
  kind: SourceKind
  record_id?: string
  label: string
  quote?: string
  call_id?: string
  tool?: string
  /** One line under the name: "Seller · active", "3 reports · scam". */
  meta?: string
  facts?: { label: string; value: string }[]
}

export interface Figure {
  value: string
  label: string
  change?: string
  tone?: 'good' | 'bad' | 'neutral'
}

export interface ChartSeries {
  name: string
  values: number[]
}

export type Block =
  | { type: 'text'; markdown: string }
  | { type: 'figures'; items: Figure[] }
  | { type: 'table'; columns: string[]; rows: (string | number)[][] }
  | { type: 'chart'; kind: 'bar' | 'stacked_bar' | 'line'; labels: string[]; series: ChartSeries[]; title?: string }
  | { type: 'document_ref'; document_id: string; version: number; title?: string; sections?: number }
  | { type: 'follow_ups'; items: string[] }
  | { type: 'sources'; items: Source[] }

export interface ClarifyOption {
  id: string
  label: string
  hint?: string
}

export interface ClarifyQuestion {
  id: string
  label: string
  kind: 'single' | 'multi'
  options: ClarifyOption[]
  default?: string | string[]
}

export type TurnStatus = 'SUCCEEDED' | 'FAILED' | 'CANCELLED' | 'TIMED_OUT' | 'BUDGET'
export type Outcome = 'stopped' | 'out_of_room' | 'broken' | 'unavailable' | 'blocked'
export type GuardrailRule = 'pii_masked' | 'off_topic' | 'loop_stopped' | 'rate_limited'

type E<T extends string, B> = { seq: number; at: string; type: T } & B

export type RunEvent =
  | E<'turn.started', { agent: { id: string; name: string }; model: string; deadline_s: number }>
  | E<'step.started', { step_id: string; title: string }>
  | E<'step.finished', { step_id: string; summary: string; duration_ms: number }>
  | E<'tool.started', { call_id: string; step_id?: string; tool: string; label: string; input?: unknown }>
  | E<'tool.retry', { call_id: string; attempt: number; error: string; next_in_ms: number; timeout_ms: number }>
  | E<
      'tool.finished',
      {
        call_id: string
        status: 'success' | 'failed' | 'skipped'
        duration_ms: number
        timing?: Timing
        result_summary?: string
        source_ids?: number[]
        sources?: Source[]
      }
    >
  | E<'model.switched', { from_provider: string; to_provider: string; reason: string }>
  | E<'thinking', { summary: string; duration_ms: number }>
  | E<'text.delta', { delta: string }>
  | E<'block', { block: Block }>
  | E<'clarify', { questions: ClarifyQuestion[] }>
  // input_tokens is the uncached input; what the prompt cache read and wrote come apart, when the agent reports them.
  | E<'usage', { input_tokens: number; output_tokens: number; cost_usd: number; provider: string; first_token_ms?: number; cache_read_tokens?: number; cache_write_tokens?: number }>
  | E<'steer.read', { steer_id: string; step_id: string | null; step_number?: number }>
  | E<'turn.pausing', { steps_done: number; reason: 'member' | 'stop_now' }>
  | E<'turn.paused', { steps_done: number; reason: 'member' | 'stop_now' }>
  | E<'turn.resumed', { by: 'continue' | 'steer' | 'input' }>
  | E<'rate.waiting', { until: string }>
  | E<'context.compacting', { before_tokens?: number }>
  | E<'context.compacted', { summary: string; before_tokens: number; after_tokens: number }>
  | E<'context.meter', { used_tokens: number; window_tokens: number }>
  | E<'guardrail', { rule: GuardrailRule; detail: string }>
  | E<
      'turn.finished',
      { status: TurnStatus; outcome?: Outcome | null; failure?: string; resets_at?: string; continuable: boolean; sources?: Source[] }
    >

export interface Timing {
  queued: number
  server: number
  db: number | null
  return: number
}

export interface Retry {
  attempt: number
  error: string
  at: string
  next_in_ms: number
  timeout_ms: number
}

export interface ToolCall {
  id: string
  stepId?: string
  tool: string
  label: string
  input?: unknown
  status: 'running' | 'success' | 'failed' | 'skipped'
  startedAt: string
  durationMs?: number
  timing?: Timing
  resultSummary?: string
  sourceIds: number[]
  retries: Retry[]
}

/** Something the run noted inside a step: a provider switch or a guardrail. */
export type Note =
  | { kind: 'switch'; from: string; to: string; reason: string; at: string }
  | { kind: 'guardrail'; rule: GuardrailRule; detail: string; at: string }

export interface Step {
  id: string
  title: string
  summary?: string
  durationMs?: number
  done: boolean
  startedAt: string
  tools: string[]
  notes: Note[]
}

export interface Steer {
  id: string
  text: string
  at: string
  /** waiting until the run reads it; read with the step it was read before; unread when the run ended without it. */
  state: 'waiting' | 'read' | 'unread'
  /** 1-based number of the step it was read before. */
  beforeStep?: number
}

export type RunPhase = 'running' | 'pausing' | 'paused' | 'awaiting_input' | 'finished'

export interface RunState {
  lastSeq: number
  phase: RunPhase
  agent?: { id: string; name: string }
  model?: string
  provider?: string
  deadlineS?: number
  startedAt?: string
  finishedAt?: string
  /** How long the run worked, pauses left out, from the turn view. */
  durationMs?: number
  firstTokenAt?: string
  /** From the usage events, when the agent measures it. */
  firstTokenMs?: number
  steps: Step[]
  /** Tool calls by id, and the order they started in. */
  tools: Record<string, ToolCall>
  toolOrder: string[]
  /** Notes made outside any step. */
  notes: Note[]
  thinking: { summary: string; durationMs: number }[]
  draft: string
  blocks: Block[]
  sources: Source[]
  clarify?: ClarifyQuestion[]
  /** input is the uncached input; cacheRead and cacheWrite are 0 where the agent does not report them. */
  usage: { input: number; output: number; cacheRead: number; cacheWrite: number; costUsd: number }
  steers: Steer[]
  pause?: { stepsDone: number; reason: 'member' | 'stop_now' }
  rateUntil?: string
  compactions: { summary: string; before: number; after: number; at: string }[]
  compacting: boolean
  meter?: { used: number; window: number }
  outcome?: { status: TurnStatus; outcome?: Outcome; failure?: string; resetsAt?: string; continuable: boolean }
}

export const emptyRun = (): RunState => ({
  lastSeq: 0,
  phase: 'running',
  steps: [],
  tools: {},
  toolOrder: [],
  notes: [],
  thinking: [],
  draft: '',
  blocks: [],
  sources: [],
  usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, costUsd: 0 },
  steers: [],
  compactions: [],
  compacting: false,
})

/** What the console does to a run without the agent: a steer it sent, before the agent reads it. */
export type LocalAction =
  | { type: 'local.steer'; steer_id: string; text: string; at: string }
  | { type: 'local.resume' }
  /** The turn view, read when the stream ended without saying how the run ended. */
  | { type: 'local.view'; view: TurnView; lastSeq: number }

function openStep(s: RunState): Step | undefined {
  for (let i = s.steps.length - 1; i >= 0; i--) if (!s.steps[i].done) return s.steps[i]
  return undefined
}

function withStep(s: RunState, id: string, f: (st: Step) => Step): Step[] {
  return s.steps.map((st) => (st.id === id ? f(st) : st))
}

function addNote(s: RunState, note: Note): RunState {
  const open = openStep(s)
  if (!open) return { ...s, notes: [...s.notes, note] }
  return { ...s, steps: withStep(s, open.id, (st) => ({ ...st, notes: [...st.notes, note] })) }
}

function mergeSources(have: Source[], add: Source[]): Source[] {
  const byN = new Map(have.map((x) => [x.n, x]))
  for (const x of add) byN.set(x.n, x)
  return [...byN.values()].sort((a, b) => a.n - b.n)
}

/** Applies one event, or a local action, to a run. */
export function reduceRun(s: RunState, ev: RunEvent | LocalAction): RunState {
  if (ev.type === 'local.steer') {
    if (s.steers.some((x) => x.id === ev.steer_id)) return s
    return { ...s, steers: [...s.steers, { id: ev.steer_id, text: ev.text, at: ev.at, state: 'waiting' }] }
  }
  if (ev.type === 'local.view') {
    const v = runFromView(ev.view)
    if (v.phase !== 'finished') return s.phase === 'running' && v.phase !== 'running' ? { ...s, phase: v.phase, clarify: v.clarify ?? s.clarify } : s
    // A finished turn: what the stream gave stays, the view fills in the rest and how it ended.
    return {
      ...s,
      lastSeq: Math.max(s.lastSeq, ev.lastSeq),
      phase: 'finished',
      agent: s.agent ?? v.agent,
      provider: s.provider ?? v.provider,
      startedAt: s.startedAt ?? v.startedAt,
      finishedAt: s.finishedAt ?? v.finishedAt,
      durationMs: v.durationMs ?? s.durationMs,
      blocks: s.blocks.length ? s.blocks : v.blocks,
      sources: mergeSources(s.sources, v.sources),
      usage: s.usage.input || s.usage.output ? s.usage : v.usage,
      firstTokenMs: s.firstTokenMs ?? v.firstTokenMs,
      steers: s.steers.length ? s.steers.map((x) => (x.state === 'waiting' ? { ...x, state: 'unread' } : x)) : v.steers,
      rateUntil: undefined,
      pause: undefined,
      clarify: undefined,
      outcome: s.outcome ?? v.outcome,
    }
  }
  if (ev.type === 'local.resume') {
    // Continue: the run goes on with the same id; its outcome clears when the agent says so.
    return s.phase === 'paused' || s.phase === 'finished' ? { ...s, phase: 'running', pause: undefined } : s
  }
  if (ev.seq <= s.lastSeq) return s
  const n: RunState = { ...s, lastSeq: ev.seq }
  switch (ev.type) {
    case 'turn.started':
      return { ...n, agent: ev.agent, model: ev.model, deadlineS: ev.deadline_s, startedAt: n.startedAt ?? ev.at, phase: 'running' }
    case 'step.started':
      if (n.steps.some((st) => st.id === ev.step_id)) return n
      return {
        ...n,
        rateUntil: undefined,
        steps: [...n.steps, { id: ev.step_id, title: ev.title, done: false, startedAt: ev.at, tools: [], notes: [] }],
      }
    case 'step.finished':
      return { ...n, steps: withStep(n, ev.step_id, (st) => ({ ...st, done: true, summary: ev.summary, durationMs: ev.duration_ms })) }
    case 'tool.started': {
      const call: ToolCall = {
        id: ev.call_id,
        stepId: ev.step_id,
        tool: ev.tool,
        label: ev.label,
        input: ev.input,
        status: 'running',
        startedAt: ev.at,
        sourceIds: [],
        retries: [],
      }
      const steps = ev.step_id ? withStep(n, ev.step_id, (st) => ({ ...st, tools: [...st.tools, ev.call_id] })) : n.steps
      return { ...n, rateUntil: undefined, steps, tools: { ...n.tools, [ev.call_id]: call }, toolOrder: [...n.toolOrder, ev.call_id] }
    }
    case 'tool.retry': {
      const call = n.tools[ev.call_id]
      if (!call) return n
      const retry: Retry = { attempt: ev.attempt, error: ev.error, at: ev.at, next_in_ms: ev.next_in_ms, timeout_ms: ev.timeout_ms }
      return { ...n, tools: { ...n.tools, [ev.call_id]: { ...call, retries: [...call.retries, retry] } } }
    }
    case 'tool.finished': {
      const call = n.tools[ev.call_id]
      if (!call) return n
      return {
        ...n,
        tools: {
          ...n.tools,
          [ev.call_id]: {
            ...call,
            status: ev.status,
            durationMs: ev.duration_ms,
            timing: ev.timing,
            resultSummary: ev.result_summary,
            sourceIds: ev.source_ids ?? [],
          },
        },
        sources: ev.sources ? mergeSources(n.sources, ev.sources) : n.sources,
      }
    }
    case 'model.switched':
      return addNote({ ...n, provider: ev.to_provider }, { kind: 'switch', from: ev.from_provider, to: ev.to_provider, reason: ev.reason, at: ev.at })
    case 'guardrail':
      return addNote(n, { kind: 'guardrail', rule: ev.rule, detail: ev.detail, at: ev.at })
    case 'thinking':
      return { ...n, thinking: [...n.thinking, { summary: ev.summary, durationMs: ev.duration_ms }] }
    case 'text.delta':
      return { ...n, draft: n.draft + ev.delta, firstTokenAt: n.firstTokenAt ?? ev.at }
    case 'block':
      if (ev.block.type === 'sources') return { ...n, sources: mergeSources(n.sources, ev.block.items) }
      return { ...n, blocks: [...n.blocks, ev.block], firstTokenAt: n.firstTokenAt ?? ev.at }
    case 'clarify':
      return { ...n, clarify: ev.questions, phase: 'awaiting_input' }
    case 'usage':
      return {
        ...n,
        provider: ev.provider || n.provider,
        firstTokenMs: n.firstTokenMs ?? ev.first_token_ms,
        usage: {
          input: n.usage.input + ev.input_tokens,
          output: n.usage.output + ev.output_tokens,
          cacheRead: n.usage.cacheRead + (ev.cache_read_tokens ?? 0),
          cacheWrite: n.usage.cacheWrite + (ev.cache_write_tokens ?? 0),
          costUsd: n.usage.costUsd + ev.cost_usd,
        },
      }
    case 'steer.read': {
      const at = n.steps.findIndex((st) => st.id === ev.step_id)
      const known = n.steers.some((x) => x.id === ev.steer_id)
      const read: Steer = { id: ev.steer_id, text: '', at: ev.at, state: 'read', beforeStep: ev.step_number ?? (at >= 0 ? at + 1 : n.steps.length + 1) }
      return {
        ...n,
        steers: known ? n.steers.map((x) => (x.id === ev.steer_id ? { ...x, state: 'read', beforeStep: read.beforeStep } : x)) : [...n.steers, read],
      }
    }
    case 'turn.pausing':
      return { ...n, phase: 'pausing', pause: { stepsDone: ev.steps_done, reason: ev.reason } }
    case 'turn.paused':
      return { ...n, phase: 'paused', pause: { stepsDone: ev.steps_done, reason: ev.reason } }
    case 'turn.resumed':
      return { ...n, phase: 'running', pause: undefined, clarify: undefined, outcome: undefined, finishedAt: undefined }
    case 'rate.waiting':
      return { ...n, rateUntil: ev.until }
    case 'context.compacting':
      return { ...n, compacting: true }
    case 'context.compacted':
      return {
        ...n,
        compacting: false,
        compactions: [...n.compactions, { summary: ev.summary, before: ev.before_tokens, after: ev.after_tokens, at: ev.at }],
      }
    case 'context.meter':
      return { ...n, meter: { used: ev.used_tokens, window: ev.window_tokens } }
    case 'turn.finished':
      return {
        ...n,
        phase: 'finished',
        finishedAt: ev.at,
        rateUntil: undefined,
        pause: undefined,
        // A step still open when the run ended stays as it was; a steer never read offers to go as a new message.
        steers: n.steers.map((x) => (x.state === 'waiting' ? { ...x, state: 'unread' } : x)),
        sources: ev.sources ? mergeSources(n.sources, ev.sources) : n.sources,
        outcome: { status: ev.status, outcome: ev.outcome ?? undefined, failure: ev.failure, resetsAt: ev.resets_at, continuable: ev.continuable },
      }
  }
}

export function replay(events: (RunEvent | LocalAction)[], from: RunState = emptyRun()): RunState {
  return events.reduce(reduceRun, from)
}

/** Whether the run is still going: running, pausing, or waiting for an answer. Paused counts as stopped for the clock. */
export const isLive = (s: RunState) => s.phase === 'running' || s.phase === 'pausing'

/** The run card's counts. */
export function counts(s: RunState) {
  const sourceNs = new Set<number>(s.sources.map((x) => x.n))
  for (const id of s.toolOrder) for (const n of s.tools[id].sourceIds) sourceNs.add(n)
  return {
    steps: s.steps.length,
    tools: s.toolOrder.length,
    sources: sourceNs.size,
    tokens: s.usage.input + s.usage.output,
  }
}

/** Milliseconds the run has worked, to now while it runs. */
export function elapsed(s: RunState, now: number): number | undefined {
  if (isLive(s)) return s.startedAt ? Math.max(0, now - new Date(s.startedAt).getTime()) : 0
  if (s.durationMs !== undefined) return s.durationMs
  if (!s.startedAt || !s.finishedAt) return undefined
  return Math.max(0, new Date(s.finishedAt).getTime() - new Date(s.startedAt).getTime())
}

/** Tool calls outside any step, for a turn without steps. */
export function flatTools(s: RunState): ToolCall[] {
  return s.toolOrder.map((id) => s.tools[id]).filter((t) => !t.stepId)
}

/** The answer's blocks; free text the model wrote outside answer() counts as one text block. */
export function answerBlocks(s: RunState): Block[] {
  if (s.blocks.some((b) => b.type === 'text') || s.phase !== 'finished' || !s.draft.trim()) return s.blocks
  return [{ type: 'text', markdown: s.draft }, ...s.blocks]
}

export type OutcomeGroup = 'done' | 'stopped' | 'out_of_room' | 'broken' | 'unavailable' | 'budget' | 'blocked'

/**
 * The four groups of an unfinished turn, each with its own help, and the
 * two that offer nothing that cannot work: a spent budget and a guardrail.
 */
export function outcomeGroup(s: RunState): OutcomeGroup | undefined {
  const o = s.outcome
  if (!o) return undefined
  if (o.status === 'SUCCEEDED') return 'done'
  if (o.status === 'BUDGET') return 'budget'
  if (o.outcome === 'blocked') return 'blocked'
  if (o.outcome) return o.outcome
  if (o.status === 'CANCELLED') return 'stopped'
  if (o.status === 'TIMED_OUT') return 'out_of_room'
  return 'broken'
}

/** A run can be continued when it says so and is not a budget or guardrail stop. */
export function canContinue(s: RunState): boolean {
  const g = outcomeGroup(s)
  if (s.phase === 'paused') return true
  return !!s.outcome?.continuable && g !== 'budget' && g !== 'blocked' && g !== 'done'
}

/** The fields of the server's turn view (AgentTurn) a run can be drawn from. */
export interface TurnView {
  status: string
  answer?: string
  blocks: Block[]
  sources: Source[]
  outcome?: Outcome
  error_code?: string
  continuable: boolean
  agent?: { id: string; name: string }
  usage?: { input_tokens: number; output_tokens: number; cost_usd: number; first_token_ms?: number; provider?: string; cache_read_tokens?: number; cache_write_tokens?: number }
  steers: { steer_id: string; text: string }[]
  questions?: ClarifyQuestion[]
  created_at: string
  finished_at?: string
  duration_ms?: number
}

/** The turn statuses that are final: the run will not write again. */
export const finalStatuses: ReadonlySet<string> = new Set(['succeeded', 'failed', 'cancelled', 'timed_out', 'budget'])

const viewStatus: Record<string, TurnStatus> = {
  succeeded: 'SUCCEEDED',
  failed: 'FAILED',
  cancelled: 'CANCELLED',
  timed_out: 'TIMED_OUT',
  budget: 'BUDGET',
}

/**
 * A run drawn from the turn view, for a turn whose events the server does
 * not stream: the answer, its sources and how it ended, without steps. An
 * answer kept only as text counts as one text block.
 */
export function runFromView(v: TurnView): RunState {
  const phase: RunPhase = v.status === 'running' ? 'running' : v.status === 'paused' ? 'paused' : v.status === 'awaiting_input' ? 'awaiting_input' : 'finished'
  const blocks = v.blocks.length || !v.answer ? v.blocks : [{ type: 'text' as const, markdown: v.answer }]
  return {
    ...emptyRun(),
    phase,
    agent: v.agent,
    provider: v.usage?.provider,
    startedAt: v.created_at,
    finishedAt: v.finished_at,
    durationMs: v.duration_ms,
    firstTokenMs: v.usage?.first_token_ms,
    blocks: blocks.filter((b) => b.type !== 'sources'),
    sources: [...v.sources].sort((a, b) => a.n - b.n),
    clarify: phase === 'awaiting_input' ? v.questions : undefined,
    usage: {
      input: v.usage?.input_tokens ?? 0,
      output: v.usage?.output_tokens ?? 0,
      cacheRead: v.usage?.cache_read_tokens ?? 0,
      cacheWrite: v.usage?.cache_write_tokens ?? 0,
      costUsd: v.usage?.cost_usd ?? 0,
    },
    steers: v.steers.map((x) => ({ id: x.steer_id, text: x.text, at: v.created_at, state: phase === 'finished' ? 'unread' : 'waiting' })),
    outcome: phase === 'finished' ? { status: viewStatus[v.status] ?? 'FAILED', outcome: v.outcome, failure: v.error_code, continuable: v.continuable } : undefined,
  }
}
