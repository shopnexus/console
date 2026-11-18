import type { Source, SourceKind } from './run'
import { toolInfo } from './tools'

/** The kinds in the order the sources panel groups them. */
export const sourceKinds: SourceKind[] = ['account', 'report', 'ticket', 'order', 'listing', 'member', 'log', 'data']

const names: Record<SourceKind, string> = {
  report: 'Report case',
  account: 'Account',
  ticket: 'Ticket',
  order: 'Order',
  listing: 'Listing',
  member: 'Member',
  data: 'Data',
  log: 'Audit log',
}

/** A kind the console knows, or data for one it does not. */
export const kindOf = (kind: string | undefined): SourceKind => (kind && kind in names ? (kind as SourceKind) : 'data')

export const kindName = (kind: SourceKind) => names[kindOf(kind)]

/** The sources panel's groups and filters. */
export const kindPlural: Record<SourceKind, string> = {
  report: 'Report cases',
  account: 'Accounts',
  ticket: 'Tickets',
  order: 'Orders',
  listing: 'Listings',
  member: 'Members',
  data: 'Data',
  log: 'Audit log',
}

/** The label an agent makes when a record has no name: a kind word and the id's start. */
const placeholder = /^(record|report|account|ticket|order|listing|log|member)\s+[0-9a-f-]{6,}$/i

/** Whether the agent gave the record a real name. */
export const hasName = (s: Source) => !!s.label.trim() && !placeholder.test(s.label.trim())

/** The name a source shows: its own, else the label of the tool that read it, never "Record 01a1ef31". */
export function sourceLabel(s: Source): string {
  if (hasName(s)) return s.label.trim()
  if (s.tool) return toolInfo(s.tool).label.replace(/_/g, ' ')
  return kindName(s.kind)
}

/** The line under a source's name: the agent's meta, else its kind and the id's start. */
export function sourceMeta(s: Source): string {
  if (s.meta) return s.meta
  return [kindName(s.kind), s.record_id?.slice(0, 8)].filter(Boolean).join(' · ')
}

/** An account's state, read from its meta or facts, for the dot on its initial. */
export function accountStatus(s: Source): 'active' | 'suspended' | undefined {
  if (kindOf(s.kind) !== 'account') return undefined
  const text = [s.meta, ...(s.facts ?? []).map((f) => f.value)].join(' ')
  return /suspend|banned|locked/i.test(text) ? 'suspended' : 'active'
}

/** Where a source's record opens in the console, if it has a page there. */
export function sourceHref(s: Source, admin = false): string | undefined {
  const kind = kindOf(s.kind)
  if (kind === 'member') return admin ? '/settings/members' : undefined
  if (kind === 'log') return admin ? '/settings/audit' : undefined
  if (!s.record_id) return undefined
  if (kind === 'account') return `/accounts/${s.record_id}`
  // A report case is an account's, and opens under the account's id.
  if (kind === 'report') return `/reports/${s.record_id}`
  if (kind === 'ticket') return `/support/${s.record_id}`
  if (kind === 'order') return `/orders/${s.record_id}`
  if (kind === 'listing') return `/listings/${s.record_id}`
  return undefined
}

/** "Open account", "Open report case", "Open audit log". */
export const openLabel = (s: Source) => `Open ${kindName(s.kind).toLowerCase()}`
