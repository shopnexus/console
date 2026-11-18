import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, api, post } from './api'

// The order and listing pages (GET /v1/console/orders/{id} and
// /v1/console/listings/{id}). Every part the server may leave out is
// optional, so a page draws what it has.

export type PersonStatus = 'active' | 'suspended' | 'deleted'

/** ConsoleOrder (GET /v1/console/orders/{id}). ShopNexus keeps no delivery events: the timeline is drawn from the dates. */
export interface OrderDetail {
  id: string
  code: string
  status: 'pending' | 'shipped' | 'completed' | 'failed' | 'cancelled' | string
  price: number
  created_at: string
  /** The side whose confirmation closed it; absent when ShopNexus closed it 3 days after delivery. */
  completed_by?: 'buyer' | 'seller'
  cancelled_by?: 'buyer' | 'seller'
  cancel_reason?: string
  shipped_at?: string
  closed_at?: string
  listing: { id: string; title: string; photo_url?: string; status: string; category_code: string; category: string; condition: string }
  buyer: { id: string; display_name: string; status: PersonStatus; since: string }
  /** orders: the seller's sold listings. */
  seller: { id: string; display_name: string; status: PersonStatus; orders: number; rating?: { average: number; count: number } }
  shipment?: { mode: 'linked' | 'manual' | string; carrier: string; tracking_code: string; status: string; fee?: number; delivered_at?: string }
  /** What the carrier says of the parcel now, for a shipment on the seller's carrier account, and why it could not be asked. */
  carrier_now?: { status: string; fee?: number }
  carrier_error?: string
  tickets: { id: string; person_display_name: string; kind: string; status: string; last_line?: string; opened_at: string }[]
}

/** ConsoleListing (GET /v1/console/listings/{id}). */
export interface ListingDetail {
  id: string
  title: string
  price: number
  description: string
  category_code: string
  category: string
  condition: string
  status: string
  allow_offers: boolean
  commune: string
  province: string
  photo_urls?: string[]
  specs?: { label: string; value: string }[]
  created_at: string
  published_at?: string
  sold_at?: string
  /** listings: on sale now; sold: sold ever. */
  seller: { id: string; display_name: string; status: PersonStatus; listings: number; sold: number }
  hidden?: { by_member_name: string; at: string }
  /** The seller's account id, which keys the report case, when the listing has reports. */
  report_case_id?: string
  reports?: { reporter_display_name: string; reason: string; note: string; at: string }[]
  price_guide?: { median: number; sample_size: number; pct_vs_guide: number }
}

const notFound = (n: number, e: unknown) => !(e instanceof ApiError && e.status === 404) && n < 1

export function useOrder(id: string | undefined) {
  return useQuery({ queryKey: ['console', 'orders', id], queryFn: () => api<OrderDetail>(`/console/orders/${id}`), enabled: !!id, retry: notFound })
}

export function useListing(id: string | undefined) {
  return useQuery({ queryKey: ['console', 'listings', id], queryFn: () => api<ListingDetail>(`/console/listings/${id}`), enabled: !!id, retry: notFound })
}

/** Hides a listing or unhides it; the listing and the report cases read again after. */
export function useListingCommands(id: string) {
  const client = useQueryClient()
  const done = () => Promise.all([client.invalidateQueries({ queryKey: ['console', 'listings', id] }), client.invalidateQueries({ queryKey: ['console', 'reports'] })])
  return {
    hide: useMutation({ mutationFn: () => post(`/console/listings/${id}/hide`), onSettled: done }),
    unhide: useMutation({ mutationFn: () => post(`/console/listings/${id}/unhide`), onSettled: done }),
  }
}

/** What a member reads when hiding or unhiding fails. */
export function listingFailure(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code === 'listing_state_conflict' || e.status === 409) return 'The listing changed status and was read again.'
    if (e.status === 404) return 'The listing is gone.'
  }
  return 'That did not go through. Try again.'
}

export const orderStatus: Record<string, string> = {
  pending: 'Waiting to ship',
  shipped: 'Shipped',
  completed: 'Completed',
  failed: 'Delivery failed',
  cancelled: 'Cancelled',
}

/** The statuses that stopped the order, drawn with an error dot. */
export const orderTrouble = new Set(['failed', 'cancelled'])

export const cancelReason: Record<string, string> = {
  buyer: 'The buyer cancelled',
  seller: 'The seller cancelled',
  seller_timeout: 'No shipment within 3 days',
  pickup_timeout: 'Not picked up within 3 days',
  shipped_to_another: 'Shipped to another buyer',
  listing_closed: 'The listing closed',
}

export const shipmentStatus: Record<string, string> = {
  pending_pickup: 'Waiting for pickup',
  in_transit: 'In transit',
  delivered: 'Delivered',
  failed: 'Delivery failed',
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

export const conditionLabel: Record<string, string> = { new: 'New', like_new: 'Like new', used: 'Used' }

/** A status word the console has no label for, readable: "out_for_delivery" → "Out for delivery". */
export const humanize = (s: string) => s.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())

/** Ask the agent about a record: a new chat with the record attached (the chat reads ?attach=kind:id and ?label). */
export function askHref(kind: 'order' | 'listing', id: string, label: string) {
  return `/?${new URLSearchParams({ attach: `${kind}:${id}`, label })}`
}
