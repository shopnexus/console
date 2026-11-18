import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, api, post } from './api'

// The order and listing pages (GET /v1/console/orders/{id} and
// /v1/console/listings/{id}). Every part the server may leave out is
// optional, so a page draws what it has.

export interface OrderParty {
  id: string
  display_name: string
  status?: 'active' | 'suspended' | 'deleted'
}

export interface OrderDetail {
  id?: string
  code: string
  status: string
  price: number
  listing?: { id: string; title: string; photo_url?: string; status?: string; category?: string; condition?: string }
  buyer?: OrderParty & { since?: string }
  seller?: OrderParty & { orders?: number; rating?: number }
  /** Who closed it: "system", a member's name, the buyer. */
  completed_by?: string
  shipped_at?: string
  closed_at?: string
  created_at: string
  shipment?: { mode?: string; carrier?: string; tracking_code?: string; status?: string; fee?: number; delivered_at?: string }
  /** What the carrier says now, and why it could not be asked. */
  carrier_now?: string
  carrier_error?: string
  events?: { status: string; at: string; place?: string; note?: string }[]
  tickets?: { id: string; person_display_name: string; kind: string; status: string; last_line?: string; opened_at: string }[]
}

export interface ListingDetail {
  id?: string
  title: string
  price: number
  description?: string
  category_code?: string
  category_name?: string
  condition?: string
  status: string
  allow_offers?: boolean
  commune?: string
  province?: string
  photo_urls?: string[]
  specs?: { label: string; value: string }[]
  created_at: string
  published_at?: string
  sold_at?: string
  seller?: OrderParty & { listings?: number }
  hidden?: { by_member_name?: string; at: string; reason?: string }
  reports?: { reporter_display_name: string; reason: string; note?: string; at: string }[]
  /** The report case of the seller, when the listing was reported. */
  case_id?: string
  price_guide?: { median: number; pct_vs_guide: number }
}

const notFound = (n: number, e: unknown) => !(e instanceof ApiError && e.status === 404) && n < 1

export function useOrder(id: string | undefined) {
  return useQuery({ queryKey: ['console', 'orders', id], queryFn: () => api<OrderDetail>(`/console/orders/${id}`), enabled: !!id, retry: notFound })
}

export function useListing(id: string | undefined) {
  return useQuery({ queryKey: ['console', 'listings', id], queryFn: () => api<ListingDetail>(`/console/listings/${id}`), enabled: !!id, retry: notFound })
}

/** Hides a listing with the reason its seller sees, or unhides it; the listing and the report cases read again after. */
export function useListingCommands(id: string) {
  const client = useQueryClient()
  const done = () => Promise.all([client.invalidateQueries({ queryKey: ['console', 'listings', id] }), client.invalidateQueries({ queryKey: ['console', 'reports'] })])
  return {
    hide: useMutation({ mutationFn: (reason: string) => post(`/console/listings/${id}/hide`, { reason }), onSettled: done }),
    unhide: useMutation({ mutationFn: () => post(`/console/listings/${id}/unhide`), onSettled: done }),
  }
}

/** What a member reads when hiding or unhiding fails. */
export function listingFailure(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code === 'listing_state_conflict' || e.status === 409) return 'The listing changed status and was read again.'
    if (e.status === 404) return 'The listing is gone.'
    if (e.status === 400 || e.status === 422) return 'The reason is not valid.'
  }
  return 'That did not go through. Try again.'
}

export const orderStatus: Record<string, string> = {
  pending: 'Placed',
  placed: 'Placed',
  confirmed: 'Confirmed',
  shipping: 'Shipping',
  shipped: 'Shipped',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
  refused: 'Refused',
  returned: 'Returned',
  disputed: 'Disputed',
}

/** The statuses that read as gone wrong, in error. */
export const orderTrouble = new Set(['cancelled', 'refused', 'returned', 'disputed', 'failed'])

export const shipmentStatus: Record<string, string> = {
  pending_pickup: 'Waiting for pickup',
  picked_up: 'Picked up',
  in_transit: 'In transit',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  failed: 'Delivery failed',
  returned: 'Returned',
}

export const listingStatus: Record<string, string> = {
  active: 'For sale',
  hidden: 'Hidden',
  reserved: 'Reserved',
  sold: 'Sold',
  rejected: 'Rejected',
  deleted: 'Deleted',
  processing: 'Posting',
}

export const conditionLabel: Record<string, string> = {
  new: 'New',
  like_new: 'Like new',
  good: 'Good',
  fair: 'Fair',
  used: 'Used',
  for_parts: 'For parts',
}

/** A status word the console has no label for, readable: "out_for_delivery" → "Out for delivery". */
export const humanize = (s: string) => s.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())

/** Ask the agent about a record: a new chat with the record attached (the chat reads ?attach=kind:id and ?label). */
export function askHref(kind: 'order' | 'listing', id: string, label: string) {
  return `/?${new URLSearchParams({ attach: `${kind}:${id}`, label })}`
}
