import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useRef, useState } from 'react'
import { useAccount } from './accounts'
import { ApiError, api, post, shortId } from './api'
import { useTicket } from './support'

// The console agent's API: api/paths/console_agent.yaml and
// api/schemas/console_agent.yaml on the server.

export type SubjectKind = 'ticket' | 'account'

export interface Conversation {
  id: string
  subject_kind?: SubjectKind
  subject_id?: string
  /** The first question, cut to 80 characters, once there is one. */
  title?: string
  updated_at: string
}

export interface Source {
  /** The MCP tool, such as ticket_get. */
  tool: string
  label: string
  ids: string[]
}

export type TurnStatus = 'running' | 'succeeded' | 'failed' | 'cancelled' | 'timed_out'

export interface Turn {
  id: string
  /** The member who asked. */
  member_id: string
  text: string
  answer?: string
  sources: Source[]
  status: TurnStatus
  created_at: string
}

export interface ConversationDetail extends Conversation {
  turns: Turn[]
}

export interface Answer {
  conversation_id: string
  turn_id: string
  answer: string
  sources: Source[]
}

/** The longest question the server takes (agent_input_rejected above it). */
export const maxQuestion = 2000

/** Why a question got no answer, by the server's error code. */
export type Failure =
  | 'timeout'
  | 'budget'
  | 'rate_limited'
  | 'unavailable'
  | 'busy'
  | 'closed'
  | 'too_long'
  | 'not_found'
  | 'aborted'
  | 'other'

const byCode: Record<string, Failure> = {
  agent_timeout: 'timeout',
  agent_budget: 'budget',
  agent_rate_limited: 'rate_limited',
  agent_unavailable: 'unavailable',
  agent_turn_in_progress: 'busy',
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

/** What the member reads for each failure; aborted is the member's own stop and says nothing. */
export const failureText: Record<Failure, string> = {
  timeout: 'Quá 60 giây, chưa có câu trả lời.',
  budget: 'Hết hạn mức hôm nay.',
  rate_limited: 'Hỏi nhiều quá trong ít phút. Thử lại sau.',
  unavailable: 'Chưa kết nối được agent. Thử lại sau.',
  busy: 'Câu trước chưa có câu trả lời. Thử lại sau.',
  closed: 'Cuộc trò chuyện đã đóng.',
  too_long: `Câu hỏi dài quá ${maxQuestion} ký tự`,
  not_found: 'Không có cuộc trò chuyện này.',
  aborted: '',
  other: 'Chưa hỏi được. Thử lại.',
}

export type Outcome = { ok: true; answer: Answer } | { ok: false; failure: Failure }

/**
 * Asks in a conversation and waits for the whole answer (up to the agent's
 * 60 s). Never throws: a refusal, a timeout or the member's stop through
 * signal comes back as a failure. A question over maxQuestion is refused
 * here without a call.
 */
export async function ask(conversationId: string, text: string, signal?: AbortSignal): Promise<Outcome> {
  if (text.length > maxQuestion) return { ok: false, failure: 'too_long' }
  try {
    const answer = await api<Answer>(`/console/agent/conversations/${conversationId}/turns`, {
      method: 'POST',
      body: JSON.stringify({ text }),
      signal,
    })
    return { ok: true, answer }
  } catch (e) {
    return { ok: false, failure: signal?.aborted ? 'aborted' : failureOf(e) }
  }
}

/** Opens a record's shared conversation, or starts one of the caller's own without a subject. */
export function openConversation(subject?: { kind: SubjectKind; id: string }) {
  return post<Conversation>(
    '/console/agent/conversations',
    subject ? { subject_kind: subject.kind, subject_id: subject.id } : {},
  )
}

const listKey = ['agent', 'conversations'] as const
const detailKey = (id: string) => ['agent', 'conversation', id] as const

/**
 * The member's chats: their own, and the shared chats of tickets and
 * accounts, newest activity first.
 */
export function useThreads() {
  const lists = useQueries({
    queries: (['', 'ticket', 'account'] as const).map((kind) => ({
      queryKey: [...listKey, kind],
      queryFn: () =>
        api<{ items: Conversation[] }>(`/console/agent/conversations${kind ? `?subject_kind=${kind}` : ''}`),
    })),
  })
  const items = lists
    .flatMap((l) => l.data?.items ?? [])
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  return { items, isPending: lists.some((l) => l.isPending), error: lists.find((l) => l.error)?.error }
}

/** One conversation with its turns; it reads again every 5 s while a turn is still running. */
export function useConversation(id: string | undefined) {
  return useQuery({
    queryKey: detailKey(id ?? ''),
    enabled: !!id,
    queryFn: () => api<ConversationDetail>(`/console/agent/conversations/${id}`),
    refetchInterval: (q) => (q.state.data?.turns.some((t) => t.status === 'running') ? 5000 : false),
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

function without<T>(record: Record<string, T>, key: string): Record<string, T> {
  const next = { ...record }
  delete next[key]
  return next
}

export interface Waiting {
  text: string
  at: string
}

export interface Failed extends Waiting {
  failure: Failure
}

/**
 * Sending questions: per conversation, the question waiting for its answer
 * and the last failure. stop aborts the waiting call. An answer goes into
 * the conversation's cache at once and both the chat and the list read
 * again.
 */
export function useAsk(memberId: string) {
  const client = useQueryClient()
  const [waiting, setWaiting] = useState<Record<string, Waiting>>({})
  const [failed, setFailed] = useState<Record<string, Failed>>({})
  const calls = useRef(new Map<string, AbortController>())

  const send = useCallback(
    async (conversationId: string, text: string): Promise<Outcome> => {
      if (calls.current.has(conversationId)) return { ok: false, failure: 'busy' }
      const controller = new AbortController()
      calls.current.set(conversationId, controller)
      const at = new Date().toISOString()
      setFailed((f) => without(f, conversationId))
      setWaiting((w) => ({ ...w, [conversationId]: { text, at } }))
      const out = await ask(conversationId, text, controller.signal)
      calls.current.delete(conversationId)
      setWaiting((w) => without(w, conversationId))
      if (out.ok) {
        const { turn_id, answer, sources } = out.answer
        client.setQueryData<ConversationDetail>(detailKey(conversationId), (d) =>
          d && !d.turns.some((t) => t.id === turn_id)
            ? {
                ...d,
                turns: [
                  ...d.turns,
                  { id: turn_id, member_id: memberId, text, answer, sources, status: 'succeeded', created_at: at },
                ],
              }
            : d,
        )
        void client.invalidateQueries({ queryKey: ['agent'] })
      } else if (out.failure !== 'aborted' && out.failure !== 'too_long') {
        setFailed((f) => ({ ...f, [conversationId]: { text, at, failure: out.failure } }))
      }
      return out
    },
    [client, memberId],
  )

  const stop = useCallback((conversationId: string) => calls.current.get(conversationId)?.abort(), [])
  const dismiss = useCallback((conversationId: string) => setFailed((f) => without(f, conversationId)), [])

  return { waiting, failed, send, stop, dismiss }
}

/** "Ticket · Khánh Linh" or "Tài khoản · Hoàng Nam"; the short id until the name is read. */
export function useSubjectLabel(kind: SubjectKind | undefined, id: string | undefined): string {
  const ticket = useTicket(kind === 'ticket' ? id : undefined)
  const account = useAccount(kind === 'account' ? id : undefined)
  if (!kind || !id) return ''
  const name =
    kind === 'ticket' ? ticket.data?.ticket.person.display_name : account.data?.display_name
  return `${kind === 'ticket' ? 'Ticket' : 'Tài khoản'} · ${name || shortId(id)}`
}

/** A conversation's name in the list and its header. */
export function threadTitle(c: Conversation): string {
  if (c.title) return c.title
  if (c.subject_kind === 'ticket') return `Ticket ${shortId(c.subject_id ?? '')}`
  if (c.subject_kind === 'account') return `Tài khoản ${shortId(c.subject_id ?? '')}`
  return 'Cuộc mới'
}

export type DayGroup = 'Hôm nay' | 'Hôm qua' | '7 ngày trước' | 'Cũ hơn'

/** The list's day group of a time, by calendar day in the browser's zone. */
export function dayGroup(iso: string, now = new Date()): DayGroup {
  const start = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((start(now) - start(new Date(iso))) / 86_400_000)
  if (days <= 0) return 'Hôm nay'
  if (days === 1) return 'Hôm qua'
  if (days <= 7) return '7 ngày trước'
  return 'Cũ hơn'
}
