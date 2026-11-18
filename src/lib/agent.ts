import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useSyncExternalStore } from 'react'
import { useAccount } from './accounts'
import { ApiError, api, apiUrl, del, post, shortId } from './api'
import { type Block, type ClarifyQuestion, emptyRun, type LocalAction, type Outcome, reduceRun, type RunEvent, type RunState, type Source } from './run'
import { SseParser } from './sse'
import { useTicket } from './support'

// The console agent's API (spec 2026-11-18, "Architecture" and "Answer"):
// a turn is posted and answered 202 {turn_id}; its events stream from
// /v1/console/agent/turns/{id}/events and reconnect with Last-Event-ID.

export type SubjectKind = 'ticket' | 'account'

export interface Conversation {
  id: string
  subject_kind?: SubjectKind
  subject_id?: string
  /** The first question, cut to 80 characters, once there is one. */
  title?: string
  updated_at: string
}

/** AgentAttachment: a record or a document the question is about. */
export type AttachmentKind = 'ticket' | 'account' | 'order' | 'listing' | 'report_case' | 'document'

export interface Attachment {
  kind: AttachmentKind
  id: string
  label?: string
}

/** AgentTurnStatus. paused and awaiting_input wait on the member; the ones after them are final. */
export type TurnViewStatus = 'running' | 'paused' | 'awaiting_input' | 'succeeded' | 'failed' | 'cancelled' | 'timed_out' | 'budget'

/** AgentTurn: the agent's view of a turn, in the conversation and from GET …/turns/{id}. */
export interface Turn {
  id: string
  conversation_id?: string
  /** The member who asked. */
  member_id: string
  text: string
  answer?: string
  status: TurnViewStatus | 'pending'
  blocks: Block[]
  sources: Source[]
  outcome?: Outcome
  error_code?: string
  continuable: boolean
  agent?: { id: string; name: string }
  usage?: { input_tokens: number; output_tokens: number; cost_usd: number; first_token_ms?: number; provider?: string }
  steers: { steer_id: string; text: string }[]
  questions?: ClarifyQuestion[]
  /** The seq of the turn's newest event; the stream opens after it. */
  last_seq: number
  created_at: string
  /** The console's own fields for a turn it sent: what it was asked with, and a key kept when the server's id replaces the pending one. */
  client_key?: string
  attachments?: Attachment[]
  skill_id?: string
  agent_id?: string
}

export interface ConversationDetail extends Conversation {
  turns: Turn[]
}

/** The longest question the server takes (agent_input_rejected above it). */
export const maxQuestion = 2000

/** Why a question was refused, by the server's error code. */
export type Failure = 'agent_gone' | 'agent_off' | 'timeout' | 'budget' | 'rate_limited' | 'unavailable' | 'busy' | 'closed' | 'too_long' | 'not_found' | 'aborted' | 'other'

const byCode: Record<string, Failure> = {
  ai_agent_not_found: 'agent_gone',
  ai_agent_disabled: 'agent_off',
  agent_timeout: 'timeout',
  agent_budget: 'budget',
  agent_rate_limited: 'rate_limited',
  agent_unavailable: 'unavailable',
  agent_turn_in_progress: 'busy',
  turn_in_progress: 'busy',
  agent_conversation_closed: 'closed',
  agent_input_rejected: 'too_long',
  agent_conversation_not_found: 'not_found',
}

export function failureOf(e: unknown): Failure {
  if (e instanceof DOMException && e.name === 'AbortError') return 'aborted'
  if (e instanceof ApiError) {
    const f = byCode[e.code]
    if (f) return f
    // A gateway in front of the server answers without our body.
    if (e.status === 504) return 'timeout'
    if (e.status === 502 || e.status === 503) return 'unavailable'
  }
  return 'other'
}

/** What the member reads for each refusal; aborted is the member's own stop and says nothing. */
export const failureText: Record<Failure, string> = {
  agent_gone: 'That agent is no longer there. Pick another.',
  agent_off: 'That agent is turned off. Pick another.',
  timeout: 'No answer within the time limit.',
  budget: 'Your daily budget is used up.',
  rate_limited: 'Too many questions in a few minutes. Try again later.',
  unavailable: 'The agent is unavailable. Try again later.',
  busy: 'The last question is still running.',
  closed: 'This chat is closed.',
  too_long: `Questions stop at ${maxQuestion} characters`,
  not_found: 'There is no such chat.',
  aborted: '',
  other: 'The question did not go through. Try again.',
}

/** Opens a record's shared conversation, or starts one of the caller's own without a subject. */
export function openConversation(subject?: { kind: SubjectKind; id: string }) {
  return post<Conversation>('/console/agent/conversations', subject ? { subject_kind: subject.kind, subject_id: subject.id } : {})
}

const listKey = ['agent', 'conversations'] as const
export const detailKey = (id: string) => ['agent', 'conversation', id] as const

/** The member's chats: their own, and the shared chats of tickets and accounts, newest activity first. */
export function useThreads() {
  const lists = useQueries({
    queries: (['', 'ticket', 'account'] as const).map((kind) => ({
      queryKey: [...listKey, kind],
      queryFn: () => api<{ items: Conversation[] }>(`/console/agent/conversations${kind ? `?subject_kind=${kind}` : ''}`),
    })),
  })
  const items = lists.flatMap((l) => l.data?.items ?? []).sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  return { items, isPending: lists.some((l) => l.isPending), error: lists.find((l) => l.error)?.error }
}

/** One conversation with its turns. */
export function useConversation(id: string | undefined) {
  return useQuery({
    queryKey: detailKey(id ?? ''),
    enabled: !!id,
    queryFn: () => api<ConversationDetail>(`/console/agent/conversations/${id}`),
    retry: (n, e) => !(e instanceof ApiError && e.status === 404) && n < 1,
  })
}

export function useOpenConversation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: openConversation,
    onSuccess: () => client.invalidateQueries({ queryKey: listKey }),
  })
}

export interface TurnRequest {
  text: string
  agent_id?: string
  attachments?: Attachment[]
  skill_id?: string
}

/**
 * Posts a question; the agent stores the turn and answers 202 with its id.
 * While a turn is paused or waiting the server refuses with turn_in_progress:
 * the ask box sends a steer or the answer instead.
 */
export function startTurn(conversationId: string, req: TurnRequest) {
  return post<{ conversation_id?: string; turn_id: string }>(`/console/agent/conversations/${conversationId}/turns`, {
    ...req,
    attachments: req.attachments?.map(({ kind, id }) => ({ kind, id })),
  })
}

/**
 * Asking: the question shows in the conversation at once as a pending
 * turn, then the post replaces it with the turn the agent stored and starts
 * following its events. A refusal takes the pending turn out again and
 * comes back as the error.
 */
export function useStartTurn(memberId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ conversationId, req }: { conversationId: string; req: TurnRequest }) => {
      const key = `pending-${crypto.randomUUID()}`
      const pending: Turn = {
        id: key,
        client_key: key,
        member_id: memberId,
        text: req.text,
        status: 'pending',
        blocks: [],
        sources: [],
        continuable: false,
        steers: [],
        last_seq: 0,
        created_at: new Date().toISOString(),
        agent_id: req.agent_id,
        skill_id: req.skill_id,
        attachments: req.attachments,
      }
      client.setQueryData<ConversationDetail>(detailKey(conversationId), (d) =>
        d ? { ...d, turns: [...d.turns, pending] } : { id: conversationId, updated_at: pending.created_at, title: req.text.slice(0, 80), turns: [pending] },
      )
      try {
        if (req.text.length > maxQuestion) throw new ApiError(422, 'agent_input_rejected', 'too long')
        const { turn_id } = await startTurn(conversationId, req)
        client.setQueryData<ConversationDetail>(detailKey(conversationId), (d) =>
          d ? { ...d, turns: d.turns.map((t) => (t.id === key ? { ...t, id: turn_id, status: 'running' } : t)) } : d,
        )
        followTurn(turn_id)
        void client.invalidateQueries({ queryKey: listKey })
        return turn_id
      } catch (e) {
        client.setQueryData<ConversationDetail>(detailKey(conversationId), (d) => (d ? { ...d, turns: d.turns.filter((t) => t.id !== key) } : d))
        throw e
      }
    },
  })
}

// ------------------------------------------------------------------ runs --
// One store for every run the page has seen, keyed by turn id, so a run
// keeps its state across pages and two views of one turn agree.

const runs = new Map<string, RunState>()
const listeners = new Map<string, Set<() => void>>()
const streams = new Map<string, AbortController>()
/** Turns whose stream the server does not have (phase-1 turns): they show their stored answer. */
const missing = new Set<string>()

function emit(id: string) {
  listeners.get(id)?.forEach((f) => f())
}

export function dispatchRun(id: string, ev: RunEvent | LocalAction) {
  const before = runs.get(id) ?? emptyRun()
  const after = reduceRun(before, ev)
  if (after !== before) {
    runs.set(id, after)
    emit(id)
  }
}

export function runOf(id: string): RunState | undefined {
  return runs.get(id)
}

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => {
      clearTimeout(t)
      resolve()
    })
  })

/** Reads a turn's events after seq `after` until the stream ends. */
async function readEvents(id: string, after: number, onEvent: (ev: RunEvent) => void, signal: AbortSignal) {
  if (import.meta.env.VITE_MOCK_AI === '1') {
    const { mockEvents } = await import('./mock/agent')
    for await (const ev of mockEvents(id, after, signal)) onEvent(ev)
    return
  }
  const res = await fetch(apiUrl(`/console/agent/turns/${id}/events`), {
    credentials: 'include',
    signal,
    headers: { accept: 'text/event-stream', 'x-requested-with': 'shopnexus-console', ...(after ? { 'last-event-id': String(after) } : {}) },
  })
  if (!res.ok || !res.body) throw new ApiError(res.status, res.status === 404 ? 'not_found' : 'stream_failed', res.statusText)
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
  const parser = new SseParser()
  for (;;) {
    const { value, done } = await reader.read()
    if (done) return
    for (const msg of parser.push(value)) {
      try {
        onEvent(JSON.parse(msg.data) as RunEvent)
      } catch {
        // A line that is not an event is skipped.
      }
    }
  }
}

/**
 * Follows a turn's events: replays from its last seen seq, reconnects with
 * backoff when the stream drops, and stops at turn.finished, at a pause and
 * while it waits for an answer (Continue, a steer or the answer opens it
 * again). Closing the tab ends the stream, not the run.
 */
export function followTurn(id: string) {
  if (streams.has(id) || missing.has(id) || id.startsWith('pending-')) return
  const st = runs.get(id)
  if (st?.phase === 'finished') return
  const controller = new AbortController()
  streams.set(id, controller)
  void (async () => {
    let backoff = 500
    try {
      while (!controller.signal.aborted) {
        try {
          await readEvents(id, runs.get(id)?.lastSeq ?? 0, (ev) => dispatchRun(id, ev), controller.signal)
          backoff = 500
        } catch (e) {
          if (controller.signal.aborted) return
          if (e instanceof ApiError && (e.status === 404 || e.status === 403)) {
            missing.add(id)
            emit(id)
            return
          }
        }
        const phase = runs.get(id)?.phase
        if (phase === 'finished' || phase === 'paused' || phase === 'awaiting_input') return
        await sleep(backoff, controller.signal)
        backoff = Math.min(backoff * 2, 8000)
      }
    } finally {
      streams.delete(id)
    }
  })()
}

/** A turn's run, following its stream while it is not finished. undefined until the first event, or for a phase-1 turn. */
export function useRun(id: string | undefined): { run?: RunState; missing: boolean } {
  const run = useSyncExternalStore(
    (f) => {
      if (!id) return () => undefined
      const set = listeners.get(id) ?? new Set()
      set.add(f)
      listeners.set(id, set)
      return () => set.delete(f)
    },
    () => (id ? runs.get(id) : undefined),
  )
  const gone = useSyncExternalStore(
    (f) => {
      if (!id) return () => undefined
      const set = listeners.get(id) ?? new Set()
      set.add(f)
      listeners.set(id, set)
      return () => set.delete(f)
    },
    () => (id ? missing.has(id) : false),
  )
  useEffect(() => {
    if (id) followTurn(id)
  }, [id])
  return { run, missing: gone }
}

// -------------------------------------------------------------- controls --

const turnPath = (id: string, action: string) => `/console/agent/turns/${id}/${action}`

/** What a member reads when a control on a run is refused. */
export function controlFailure(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code === 'agent_turn_state' || e.code === 'turn_state') return 'The run changed state. Try again.'
    if (e.code === 'agent_answers_invalid') return 'Those answers do not fit the questions.'
    if (e.code === 'agent_forbidden' || e.code === 'forbidden') return 'Only the member who asked can do that.'
  }
  return 'That did not reach the run. Try again.'
}

/** Pause takes effect before the next model call; the call in flight and its tools finish. */
export const pauseTurn = (id: string) => post(turnPath(id, 'pause'))

/** Stop now ends the model call in flight at once; the turn goes paused with reason stop_now and can be continued. */
export const stopTurn = (id: string) => post(turnPath(id, 'stop'))

/** End closes a paused turn, or one awaiting input, as cancelled. */
export const endTurn = (id: string) => post(turnPath(id, 'end'))

/** Continue resumes the same turn with no message. */
export async function continueTurn(id: string) {
  await post(turnPath(id, 'continue'))
  dispatchRun(id, { type: 'local.resume' })
  followTurn(id)
}

/**
 * A steer: read before the run's next model call, or, on a paused run, it
 * continues the run. The receipt shows Waiting until steer.read names it.
 */
export async function steerTurn(id: string, text: string) {
  const r = await post<{ steer_id: string; turn_id: string; resumed: boolean }>(turnPath(id, 'steer'), { text })
  dispatchRun(id, { type: 'local.steer', steer_id: r?.steer_id ?? crypto.randomUUID(), text, at: new Date().toISOString() })
  if (r?.resumed || runs.get(id)?.phase === 'paused') dispatchRun(id, { type: 'local.resume' })
  followTurn(id)
}

export type Answers = Record<string, string | string[]>

/** The answers to the agent's clarifying questions; the run goes on. */
export async function answerTurn(id: string, body: { answers: Answers }) {
  await post(turnPath(id, 'input'), body)
  dispatchRun(id, { type: 'local.resume' })
  followTurn(id)
}

// ------------------------------------------------- tool calls, documents --

/** AgentToolCall. */
export interface ToolCallDetail {
  id: string
  turn_id: string
  tool: string
  status: 'running' | 'success' | 'failed' | 'skipped'
  input: unknown
  output?: unknown
  /** The output was too long to keep whole. */
  output_spilled: boolean
  attempts: number
  started_at: string
  finished_at?: string
  duration_ms?: number
  timing?: { queued: number | null; server: number | null; db: number | null; return: number | null }
}

/** One tool call's input, result and timing, for the tool panel. */
export function useToolCall(id: string | undefined) {
  return useQuery({ queryKey: ['agent', 'tool-call', id], enabled: !!id, queryFn: () => api<ToolCallDetail>(`/console/agent/tool-calls/${id}`) })
}

export type DocSection =
  | { type: 'markdown'; markdown: string }
  | { type: 'table'; columns: string[]; rows: (string | number)[][]; title?: string }
  | { type: 'chart'; kind: 'bar' | 'stacked_bar' | 'line'; labels: string[]; series: { name: string; values: number[] }[]; title?: string }

/** AgentDocumentVersion. */
export interface DocumentVersion {
  version: number
  title: string
  sections: DocSection[]
  turn_id?: string
  created_by?: string
  created_at: string
}

/** AgentDocument: a document the agent wrote, with every version, newest first. */
export interface AgentDocument {
  id: string
  conversation_id: string
  turn_id?: string
  title: string
  latest_version: number
  created_by?: string
  created_at: string
  updated_at: string
  versions: DocumentVersion[]
}

/** A document the agent wrote, with all its versions. */
export function useDocument(id: string | undefined) {
  return useQuery({ queryKey: ['agent', 'document', id], enabled: !!id, queryFn: () => api<AgentDocument>(`/console/agent/documents/${id}`) })
}

/** AgentSkillVariable. */
export interface SkillVariable {
  name: string
  label?: string
  default?: string
}

/** AgentSkill. */
export interface Skill {
  id: string
  created_by: string
  name: string
  slug: string
  description: string
  /** The question, with {{name}} for each variable. */
  prompt: string
  variables: SkillVariable[]
  updated_at: string
}

/** Saved skills, shared with every member; / in the ask box lists them. */
export function useSkills() {
  return useQuery({ queryKey: ['agent', 'skills'], queryFn: () => api<{ items: Skill[] }>('/console/agent/skills'), staleTime: 60_000 })
}

export function useSkillCommands() {
  const client = useQueryClient()
  const done = () => client.invalidateQueries({ queryKey: ['agent', 'skills'] })
  return {
    create: useMutation({
      mutationFn: (s: { name: string; slug?: string; description?: string; prompt: string; variables?: SkillVariable[] }) => post<Skill>('/console/agent/skills', s),
      onSettled: done,
    }),
    remove: useMutation({ mutationFn: (id: string) => del(`/console/agent/skills/${id}`), onSettled: done }),
  }
}

/** The {{variables}} a question names, for a skill made from it. */
export function variablesOf(prompt: string): SkillVariable[] {
  return [...new Set([...prompt.matchAll(/\{\{\s*([a-z][a-z0-9_]*)\s*\}\}/g)].map((m) => m[1]))].map((name) => ({ name }))
}

/** What a member reads when saving a skill fails. */
export function skillFailure(e: unknown): string {
  if (e instanceof ApiError && (e.code === 'agent_skill_taken' || e.code === 'skill_exists')) return 'Another skill has that name.'
  if (e instanceof ApiError && e.code === 'agent_skill_invalid') return 'The skill does not fit: a name and a question are needed.'
  return 'The skill did not save.'
}

// ------------------------------------------------------------ labelling --

/** "Ticket · Khánh Linh" or "Account · Hoàng Nam"; the short id until the name is read. */
export function useSubjectLabel(kind: SubjectKind | undefined, id: string | undefined): string {
  const ticket = useTicket(kind === 'ticket' ? id : undefined)
  const account = useAccount(kind === 'account' ? id : undefined)
  if (!kind || !id) return ''
  const name = kind === 'ticket' ? ticket.data?.ticket.person.display_name : account.data?.display_name
  return `${kind === 'ticket' ? 'Ticket' : 'Account'} · ${name || shortId(id)}`
}

/** A conversation's name in the list and its header. */
export function threadTitle(c: Conversation): string {
  if (c.title) return c.title
  if (c.subject_kind === 'ticket') return `Ticket ${shortId(c.subject_id ?? '')}`
  if (c.subject_kind === 'account') return `Account ${shortId(c.subject_id ?? '')}`
  return 'New chat'
}

export type DayGroup = 'Today' | 'Yesterday' | 'Previous 7 days' | 'Older'

/** The list's day group of a time, by calendar day in the browser's zone. */
export function dayGroup(iso: string, now = new Date()): DayGroup {
  const start = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((start(now) - start(new Date(iso))) / 86_400_000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days <= 7) return 'Previous 7 days'
  return 'Older'
}
