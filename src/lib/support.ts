import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, api, type Page, post, shortId } from './api'
import { usePaged } from './paged'
import type { PersonStatus } from './commerce'

// The support API's shapes: api/schemas/support.yaml and console.yaml on the server.

export type TicketKind = 'not_received' | 'carrier_request' | 'other'
export type TicketStatus = 'open' | 'resolved'

export interface Ticket {
  id: string
  kind: TicketKind
  status: TicketStatus
  conversation_id: string
  first_message_id?: string
  order?: { id: string; title: string; photo_url?: string; carrier?: string; tracking_code?: string }
  carrier_name?: string
  opened_at: string
  events: { kind: 'opened' | 'resolved' | 'reopened'; at: string }[]
}

export interface Person {
  id: string
  display_name: string
  avatar_url?: string
  deleted: boolean
  official?: boolean
}

/** The name the console shows: "Deleted" only for a deleted account, the id when no name is set. */
export const personName = (p: Person) => (p.deleted ? 'Deleted' : p.display_name || shortId(p.id))

export interface ConsoleTicket {
  ticket: Ticket
  person: Person
  last_text?: string
  last_from: 'person' | 'shopnexus'
  last_message_at: string
}

export interface Message {
  id: string
  sender_id: string
  text: string
  photos: { upload_id: string; url?: string; thumb_url?: string }[]
  reply_to?: { id: string; sender_id: string; text: string; photos: number }
  status: 'processing' | 'sent' | 'failed'
  created_at: string
}

/** A message as a quote reads it: "2 photos · " before its text. */
export function quoteOf(m: { text: string; photos: number }): string {
  const photos = m.photos ? `${m.photos} photo${m.photos === 1 ? '' : 's'}` : ''
  return [photos, m.text].filter(Boolean).join(' · ')
}

export interface ConsoleMessage {
  message: Message
  member?: string
  automatic: boolean
}

export interface ConsoleTicketDetail {
  ticket: ConsoleTicket
  person_status: PersonStatus
  joined_at: string
  order?: {
    id: string
    title: string
    price: number
    status: string
    seller: Person
    carrier?: string
    tracking_code?: string
    shipment_status?: string
    shipped_at?: string
    delivered_at?: string
  }
  same_carrier_30d?: number
  others: Ticket[]
  messages: Page<ConsoleMessage>
}

export const kindLabel: Record<TicketKind, string> = {
  not_received: 'Not received',
  carrier_request: 'Carrier request',
  other: 'Other request',
}

/**
 * A ticket by its request, as its card in the chat heads it: "Carrier
 * request · GHN", "Not received · Áo khoác", an other request's first words.
 * The agent's sources name tickets the same way.
 */
export function ticketTitle(t: Ticket, firstText?: string): string {
  const first = t.kind === 'other' ? firstText?.replace(/\s+/g, ' ').trim() : undefined
  const about = t.carrier_name || t.order?.title || (first && (first.length > 60 ? `${first.slice(0, 59)}…` : first))
  return about ? `${kindLabel[t.kind]} · ${about}` : kindLabel[t.kind]
}

/** The queue's kind filter. */
export const kindChip: Record<TicketKind, string> = {
  not_received: 'Not received',
  carrier_request: 'Carrier request',
  other: 'Other',
}

export const shopNexusId = '0193e000-0000-7000-8000-000000000001'

/** The queue, 50 tickets a page; "More" reads the next. */
export const useQueue = (status: TicketStatus, kind: TicketKind | null) =>
  usePaged<ConsoleTicket>(['support', 'queue', status, kind], '/console/support/tickets', { status, kind }, { refetchOnWindowFocus: true })

/** A page of a ticket's chat older than cursor, newest first. */
export function olderMessages(id: string, cursor: string) {
  return api<Page<ConsoleMessage>>(`/console/support/tickets/${id}/messages?${new URLSearchParams({ cursor })}`)
}

/** What a member reads when a command on a ticket fails. */
export function failureText(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code === 'ticket_not_allowed') return 'The ticket changed status and was read again.'
    if (e.code === 'account_deleted') return 'The person deleted their account; the reply cannot be sent.'
    if (e.code === 'invalid_message') return 'The reply is not valid.'
  }
  return 'That did not go through. Try again.'
}

export function useTicket(id: string | undefined) {
  return useQuery({
    queryKey: ['support', 'ticket', id],
    enabled: !!id,
    queryFn: () => api<ConsoleTicketDetail>(`/console/support/tickets/${id}`),
    refetchOnWindowFocus: true,
  })
}

export function useOpenCount() {
  return useQuery({
    queryKey: ['support', 'summary'],
    queryFn: () => api<{ open: number }>('/console/support/summary'),
    refetchOnWindowFocus: true,
  })
}

export function useTicketCommands(id: string) {
  const client = useQueryClient()
  // A failure reads again too: a 409 means another member moved the ticket.
  const done = () => client.invalidateQueries({ queryKey: ['support'] })
  return {
    reply: useMutation({
      mutationFn: (r: { body: string; reply_to?: string }) =>
        api<ConsoleMessage>(`/console/support/tickets/${id}/replies`, {
          method: 'POST',
          body: JSON.stringify(r),
          headers: { 'idempotency-key': crypto.randomUUID() },
        }),
      onSettled: done,
    }),
    resolve: useMutation({ mutationFn: () => post<ConsoleTicket>(`/console/support/tickets/${id}/resolve`), onSettled: done }),
    reopen: useMutation({ mutationFn: () => post<ConsoleTicket>(`/console/support/tickets/${id}/reopen`), onSettled: done }),
  }
}
