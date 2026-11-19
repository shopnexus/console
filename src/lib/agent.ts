import { type QueryClient, useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router'
import { useAccount } from './accounts'
import { ApiError, api, apiStream, del, noRetryOn404, patch, post, shortId } from './api'
import { emptyRun, type LocalAction, reduceRun, runFromView, type RunEvent, type RunState, type TurnView } from './run'
import { kindName } from './sources'
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
export interface Turn extends TurnView {
  id: string
  conversation_id?: string
  /** The member who asked. */
  member_id: string
  text: string
  status: TurnViewStatus | 'pending'
  /** The seq of the turn's newest event; the stream opens after it. */
  last_seq: number
  /** The console's own fields for a turn it sent: what it was asked with, and a key kept when the server's id replaces the pending one. */
  client_key?: string
  /** Why a question the console sent did not reach the agent; the bubble offers Retry. */
  failed?: string
  attachments?: Attachment[]
  skill_id?: string
  agent_id?: string
}

export interface ConversationDetail extends Conversation {
  turns: Turn[]
  /** For a temporary chat whose send failed: the conversation the agent made, which Retry posts to. */
  real_id?: string
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
  budget: 'The AI budget is used up.',
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
  // combine runs again only when a list changes, so the sort is not redone on every render.
  return useQueries({
    queries: (['', 'ticket', 'account'] as const).map((kind) => ({
      queryKey: [...listKey, kind],
      queryFn: () => api<{ items: Conversation[] }>(`/console/agent/conversations${kind ? `?subject_kind=${kind}` : ''}`),
    })),
    combine: (lists) => ({
      items: lists.flatMap((l) => l.data?.items ?? []).sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
      isPending: lists.some((l) => l.isPending),
      error: lists.find((l) => l.error)?.error,
    }),
  })
}

/** One conversation with its turns. */
/**
 * A conversation read from the server, with what the console sent and the
 * server did not show yet kept: a read that started before a question was
 * posted must not take the question away. A stored turn the console sent
 * keeps its client key, so its view is not drawn again.
 */
export function withLocalTurns(server: ConversationDetail, local: ConversationDetail | undefined): ConversationDetail {
  if (!local) return server
  const sent = local.turns.filter((t) => t.client_key)
  const byId = new Map(sent.map((t) => [t.id, t]))
  const turns = server.turns.map((t) => {
    const mine = byId.get(t.id)
    return mine ? { ...t, client_key: mine.client_key, agent_id: t.agent_id ?? mine.agent_id, attachments: t.attachments ?? mine.attachments, skill_id: t.skill_id ?? mine.skill_id } : t
  })
  const seen = new Set(server.turns.map((t) => t.id))
  return { ...server, turns: [...turns, ...sent.filter((t) => !seen.has(t.id))] }
}

export function useConversation(id: string | undefined) {
  const client = useQueryClient()
  return useQuery({
    queryKey: detailKey(id ?? ''),
    // A temporary chat lives in the cache only until the agent has the conversation.
    enabled: !!id && !isTempChat(id),
    queryFn: async () => withLocalTurns(await api<ConversationDetail>(`/console/agent/conversations/${id}`), client.getQueryData<ConversationDetail>(detailKey(id!))),
    retry: noRetryOn404,
  })
}

export function useOpenConversation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: openConversation,
    onSuccess: () => client.invalidateQueries({ queryKey: listKey }),
  })
}

/** Asks the agent about an account or a ticket: opens (or makes) its shared chat and goes there. */
export function useAskAgent() {
  const open = useOpenConversation()
  const navigate = useNavigate()
  const ask = async (subject: { kind: SubjectKind; id: string }) => navigate(`/agent/${(await open.mutateAsync(subject)).id}`)
  return { ask, pending: open.isPending }
}

/** The member's own chats that mention a record, as the record's agent tabs. */
export function useMentionThreads(kind: AttachmentKind, id: string) {
  return useQuery({
    queryKey: [...listKey, 'mention', kind, id],
    queryFn: () => api<{ items: Conversation[] }>(`/console/agent/conversations?${new URLSearchParams({ mention_kind: kind, mention_id: id })}`),
  })
}

// A record's page opens a new chat with the record attached: ?attach=order:<id>&label=Order SN-1042.
const askKinds = ['order', 'listing'] as const
type AskKind = (typeof askKinds)[number]

/** Ask the agent about an order or a listing: a new chat with the record attached. */
export function askHref(kind: AskKind, id: string, label: string) {
  return `/?${new URLSearchParams({ attach: `${kind}:${id}`, label })}`
}

/** The record an askHref link attaches, if the page's query names one. */
export function attachmentFromParams(params: URLSearchParams): Attachment | undefined {
  const [kind, id] = (params.get('attach') ?? '').split(':')
  if (!id || !askKinds.includes(kind as AskKind)) return undefined
  return { kind: kind as AskKind, id, label: params.get('label') ?? undefined }
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
  return post<{ conversation_id?: string; turn_id: string }>(`/console/agent/conversations/${conversationId}/turns`, req)
}

/** A pending turn for a question the console is about to send: it shows at once. */
export function pendingTurn(memberId: string, req: TurnRequest): Turn {
  const key = `pending-${crypto.randomUUID()}`
  return {
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
}

/** Puts a turn into the conversation cached under cacheId, or replaces the one with the same client key. */
export function putTurn(client: QueryClient, cacheId: string, turn: Turn) {
  client.setQueryData<ConversationDetail>(detailKey(cacheId), (d) => {
    if (!d) return { id: cacheId, updated_at: turn.created_at, title: turn.text.slice(0, 80), turns: [turn] }
    const at = d.turns.findIndex((t) => t.client_key && t.client_key === turn.client_key)
    return { ...d, turns: at < 0 ? [...d.turns, turn] : d.turns.map((t, i) => (i === at ? turn : t)) }
  })
}

/**
 * Posts a pending turn's question to conversationId and swaps the pending
 * turn in the cache under cacheId for the stored one, then follows its
 * events. A refusal leaves the turn in the cache marked failed, for Retry.
 */
export async function postTurn(client: QueryClient, cacheId: string, conversationId: string, pending: Turn, req: TurnRequest): Promise<string | undefined> {
  putTurn(client, cacheId, { ...pending, failed: undefined, status: 'pending' })
  // A read of the conversation already on its way would land without the question; it is dropped, keeping the question.
  await client.cancelQueries({ queryKey: detailKey(cacheId) }, { revert: false })
  putTurn(client, cacheId, { ...pending, failed: undefined, status: 'pending' })
  try {
    if (req.text.length > maxQuestion) throw new ApiError(422, 'agent_input_rejected', 'too long')
    const { turn_id } = await startTurn(conversationId, req)
    putTurn(client, cacheId, { ...pending, id: turn_id, status: 'running', failed: undefined })
    followTurn(turn_id)
    // The stored conversation is read again; the turn keeps its place and its key meanwhile.
    void client.invalidateQueries({ queryKey: detailKey(cacheId) })
    void client.invalidateQueries({ queryKey: listKey })
    return turn_id
  } catch (e) {
    putTurn(client, cacheId, { ...pending, failed: failureText[failureOf(e)] || failureText.other })
    throw e
  }
}

/** Takes a turn the console sent out of the cached conversation, as after a failed send is dismissed. */
export function dropTurn(client: QueryClient, cacheId: string, clientKey: string) {
  client.setQueryData<ConversationDetail>(detailKey(cacheId), (d) => (d ? { ...d, turns: d.turns.filter((t) => t.client_key !== clientKey) } : d))
}

/** A new chat's address before the conversation exists; it is replaced once the agent has it. */
export const isTempChat = (id: string | undefined) => !!id?.startsWith('new-')

/**
 * Posts a pending turn in the chat cached under chatId. A temporary chat (the
 * caller already shows it) posts to the conversation it made earlier, or
 * makes one first; once the turn is in, its cache moves to the real id and
 * onReady gets that id. A refusal in a chat that exists is thrown, and the
 * turn stays in the cache marked failed; a new chat that fails keeps the
 * failed turn, whose Retry comes back here.
 */
export async function sendTurn(
  client: QueryClient,
  chatId: string,
  pending: Turn,
  req: TurnRequest,
  onReady: (id: string) => void,
) {
  if (!isTempChat(chatId)) {
    await postTurn(client, chatId, chatId, pending, req)
    return
  }
  let conversationId = client.getQueryData<ConversationDetail>(detailKey(chatId))?.real_id
  const made = !conversationId
  if (!conversationId) {
    try {
      conversationId = (await openConversation()).id
    } catch (e) {
      putTurn(client, chatId, { ...pending, failed: failureText[failureOf(e)] || failureText.other })
      return
    }
  }
  try {
    await postTurn(client, chatId, conversationId, pending, req)
  } catch (e) {
    if (!made) throw e
    // Retry posts to the conversation that now exists.
    client.setQueryData<ConversationDetail>(detailKey(chatId), (d) => (d ? { ...d, real_id: conversationId } : d))
    return
  }
  // The cache moves to the real id before the chat goes there; postTurn has already read the chat list again.
  const d = client.getQueryData<ConversationDetail>(detailKey(chatId))
  if (d) client.setQueryData<ConversationDetail>(detailKey(conversationId), { ...d, id: conversationId, real_id: undefined })
  onReady(conversationId)
  client.removeQueries({ queryKey: detailKey(chatId) })
}

/** Renames a conversation; the list shows the new title at once. */
export function useRenameConversation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => patch<Conversation>(`/console/agent/conversations/${id}`, { title }),
    onMutate: ({ id, title }) => {
      client.setQueriesData<{ items: Conversation[] }>({ queryKey: listKey }, (l) => (l ? { items: l.items.map((c) => (c.id === id ? { ...c, title } : c)) } : l))
      client.setQueryData<ConversationDetail>(detailKey(id), (d) => (d ? { ...d, title } : d))
    },
    onSettled: () => client.invalidateQueries({ queryKey: listKey }),
  })
}

/** Deletes a conversation; it leaves the list at once and comes back if the agent refuses. */
export function useDeleteConversation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => del(`/console/agent/conversations/${id}`),
    onMutate: (id) => {
      client.setQueriesData<{ items: Conversation[] }>({ queryKey: listKey }, (l) => (l ? { items: l.items.filter((c) => c.id !== id) } : l))
    },
    onSuccess: (_, id) => client.removeQueries({ queryKey: detailKey(id) }),
    onSettled: () => client.invalidateQueries({ queryKey: listKey }),
  })
}

/** What a member reads when a rename or delete is refused. */
export function conversationFailure(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code === 'agent_turn_in_progress') return 'A turn is still open in this chat. End it first.'
    if (e.code === 'agent_forbidden') return "A ticket's or an account's chat is an admin's to change."
    if (e.code === 'agent_title_invalid') return 'A title has 1 to 80 characters.'
  }
  return 'That did not go through. Try again.'
}

// ------------------------------------------------------------------ runs --
// One store for every run the page has seen, keyed by turn id, so a run
// keeps its state across pages and two views of one turn agree.

const runs = new Map<string, RunState>()
const listeners = new Map<string, Set<() => void>>()
const streams = new Map<string, AbortController>()

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
  for await (const msg of apiStream(`/console/agent/turns/${id}/events`, { after, signal })) {
    try {
      onEvent(JSON.parse(msg.data) as RunEvent)
    } catch {
      // A line that is not an event is skipped.
    }
  }
}

/** Reads the turn view and applies it: how a run ended when its stream did not say. */
async function readView(id: string): Promise<RunState | undefined> {
  try {
    const view = await api<Turn>(`/console/agent/turns/${id}`)
    dispatchRun(id, { type: 'local.view', view, lastSeq: view.last_seq })
  } catch {
    // Without the view the stream is tried again.
  }
  return runs.get(id)
}

/**
 * Follows a running turn's events: replays from its last seen seq,
 * reconnects with backoff, and stops at turn.finished, at a pause and while
 * it waits for an answer (Continue, a steer or the answer opens it again).
 * A stream that ends or is refused without saying how the run ended is
 * settled by the turn view, so a finished turn never waits. Closing the tab
 * ends the stream, not the run.
 */
export function followTurn(id: string) {
  if (streams.has(id) || id.startsWith('pending-')) return
  const st = runs.get(id)
  if (st?.phase === 'finished') return
  const controller = new AbortController()
  streams.set(id, controller)
  void (async () => {
    let backoff = 500
    try {
      while (!controller.signal.aborted) {
        let refused = false
        try {
          await readEvents(id, runs.get(id)?.lastSeq ?? 0, (ev) => dispatchRun(id, ev), controller.signal)
          backoff = 500
        } catch (e) {
          if (controller.signal.aborted) return
          refused = e instanceof ApiError && e.status >= 400 && e.status < 500
        }
        let phase = runs.get(id)?.phase
        if (phase === 'finished' || phase === 'paused' || phase === 'awaiting_input') return
        phase = (await readView(id))?.phase
        if (phase !== 'running' && phase !== 'pausing') return
        if (refused) return
        await sleep(backoff, controller.signal)
        backoff = Math.min(backoff * 2, 8000)
      }
    } finally {
      streams.delete(id)
    }
  })()
}

/**
 * Puts a turn the conversation listed into the store: a finished one, a
 * paused one and one waiting for answers from its turn view at once (a
 * finished turn opens no stream); a running one is followed from its first
 * event.
 */
export function seedTurn(turn: Turn) {
  if (turn.status === 'pending' || turn.failed) return
  if (!runs.has(turn.id) && turn.status !== 'running') {
    const seeded = { ...runFromView(turn), lastSeq: turn.last_seq }
    runs.set(turn.id, seeded)
    emit(turn.id)
    if (turn.last_seq > 0) void replayTurn(turn, seeded)
  }
  if (turn.status === 'running') followTurn(turn.id)
}

/**
 * The turn view has the answer and how the run ended, not its steps, tool
 * calls or thinking. A turn that is not running reads its events once from
 * the start, and the view fills in what they leave out. The result replaces
 * the seeded run only while nothing else (a stream, a continue) changed it.
 */
async function replayTurn(turn: Turn, seeded: RunState) {
  if (streams.has(turn.id)) return
  let s = emptyRun()
  try {
    await readEvents(turn.id, 0, (ev) => (s = reduceRun(s, ev)), new AbortController().signal)
  } catch {
    // The view's run stays.
    return
  }
  if (runs.get(turn.id) !== seeded || s.lastSeq === 0) return
  runs.set(turn.id, reduceRun(s, { type: 'local.view', view: turn, lastSeq: turn.last_seq }))
  emit(turn.id)
}

/** A turn's run: from the store, else drawn from the turn view for a turn that is not running. */
export function useRun(id: string | undefined, turn?: Turn): { run?: RunState } {
  const subscribe = useCallback(
    (f: () => void) => {
      if (!id) return () => undefined
      const set = listeners.get(id) ?? new Set()
      set.add(f)
      listeners.set(id, set)
      return () => void set.delete(f)
    },
    [id],
  )
  const stored = useSyncExternalStore(subscribe, () => (id ? runs.get(id) : undefined))
  // Until the effect seeds the store, a turn that is not running draws from its view, so it never shows the waiting word.
  const view = useMemo(() => (turn && !stored && turn.status !== 'running' && turn.status !== 'pending' && !turn.failed ? runFromView(turn) : undefined), [turn, stored])
  useEffect(() => {
    if (!id) return
    if (turn) seedTurn(turn)
    else followTurn(id)
  }, [id, turn])
  return { run: stored ?? view }
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
  /** Each failed attempt's error. */
  attempt_errors?: { attempt: number; error: string; at: string }[]
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
  return `${kindName(kind)} · ${name || shortId(id)}`
}

/** A conversation's name in the list and its header. */
export function threadTitle(c: Conversation): string {
  if (c.title) return c.title
  if (c.subject_kind) return `${kindName(c.subject_kind)} ${shortId(c.subject_id ?? '')}`
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
