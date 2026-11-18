import type { Source, SourceKind } from './run'

const names: Record<SourceKind, string> = {
  report: 'Report case',
  account: 'Account',
  ticket: 'Ticket',
  order: 'Order',
  listing: 'Listing',
  data: 'Data',
  log: 'Audit log',
}

export const kindName = (kind: SourceKind) => names[kind] ?? 'Data'

/** The sources panel's filters, in this order. */
export const kindPlural: Record<SourceKind, string> = {
  report: 'Reports',
  account: 'Accounts',
  ticket: 'Tickets',
  order: 'Orders',
  listing: 'Listings',
  data: 'Data',
  log: 'Logs',
}

/** Where a source's record opens in the console, if it has a page. */
export function sourceHref(s: Source): string | undefined {
  if (!s.record_id) return undefined
  if (s.kind === 'account') return `/accounts/${s.record_id}`
  if (s.kind === 'report') return `/reports/${s.record_id}`
  if (s.kind === 'ticket') return `/support/${s.record_id}`
  return undefined
}
