import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type Page, post } from './api'

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

export interface ConsoleMessage {
  message: Message
  member?: string
  automatic: boolean
}

export interface ConsoleTicketDetail {
  ticket: ConsoleTicket
  person_status: 'active' | 'suspended' | 'deleted'
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
  not_received: 'Báo chưa nhận hàng',
  carrier_request: 'Xin thêm hãng',
  other: 'Yêu cầu khác',
}

/** The queue's kind chips: "Khác" is short enough for a chip. */
export const kindChip: Record<TicketKind, string> = {
  not_received: 'Chưa nhận hàng',
  carrier_request: 'Xin thêm hãng',
  other: 'Khác',
}

export const shopNexusId = '0193e000-0000-7000-8000-000000000001'

export function useQueue(status: TicketStatus, kind: TicketKind | null) {
  const q = new URLSearchParams({ status, limit: '50', ...(kind ? { kind } : {}) })
  return useQuery({
    queryKey: ['support', 'queue', status, kind],
    queryFn: () => api<Page<ConsoleTicket>>(`/console/support/tickets?${q}`),
    refetchOnWindowFocus: true,
  })
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
  const done = () => client.invalidateQueries({ queryKey: ['support'] })
  return {
    reply: useMutation({
      mutationFn: (body: string) =>
        api<ConsoleMessage>(`/console/support/tickets/${id}/replies`, {
          method: 'POST',
          body: JSON.stringify({ body }),
          headers: { 'idempotency-key': crypto.randomUUID() },
        }),
      onSuccess: done,
    }),
    resolve: useMutation({ mutationFn: () => post<ConsoleTicket>(`/console/support/tickets/${id}/resolve`), onSuccess: done }),
    reopen: useMutation({ mutationFn: () => post<ConsoleTicket>(`/console/support/tickets/${id}/reopen`), onSuccess: done }),
  }
}
