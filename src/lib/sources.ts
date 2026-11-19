import type { Source, SourceKind } from './run'
import { shortId } from './api'
import { toolInfo } from './tools'

/** The kinds in the order the sources panel groups them. */
export const sourceKinds: SourceKind[] = ['account', 'report', 'ticket', 'order', 'listing', 'member', 'log', 'data']

/** What the console knows of each record kind: its name, and where its record opens. */
interface KindInfo {
  name: string
  plural: string
  /** The record's page, from its id. */
  page?: (id: string) => string
  /** A page only admins have, the same for every record of the kind. */
  admin?: string
}

const kinds: Record<SourceKind, KindInfo> = {
  account: { name: 'Account', plural: 'Accounts', page: (id) => `/accounts/${id}` },
  // A report case is an account's, and opens under the account's id.
  report: { name: 'Report case', plural: 'Report cases', page: (id) => `/reports/${id}` },
  ticket: { name: 'Ticket', plural: 'Tickets', page: (id) => `/support/${id}` },
  order: { name: 'Order', plural: 'Orders', page: (id) => `/orders/${id}` },
  listing: { name: 'Listing', plural: 'Listings', page: (id) => `/listings/${id}` },
  member: { name: 'Member', plural: 'Members', admin: '/settings/members' },
  log: { name: 'Audit log', plural: 'Audit log', admin: '/settings/audit' },
  data: { name: 'Data', plural: 'Data' },
}

/** Other spellings of a kind: an attachment's report_case is a report. */
const aliases = new Map<string, SourceKind>([['report_case', 'report']])

/** A kind the console knows, or data for one it does not. */
export const kindOf = (kind: string | undefined): SourceKind =>
  !kind ? 'data' : Object.hasOwn(kinds, kind) ? (kind as SourceKind) : (aliases.get(kind) ?? 'data')

/** "Account", "Report case". */
export const kindName = (kind: string) => kinds[kindOf(kind)].name

/** The sources panel's groups and filters: "Accounts", "Report cases". */
export const kindPlural = (kind: string) => kinds[kindOf(kind)].plural

/** Where a record opens in the console, if it has a page there. */
export function recordHref(kind: string, id: string | undefined, admin = false): string | undefined {
  const k = kinds[kindOf(kind)]
  if (k.admin) return admin ? k.admin : undefined
  return id && k.page ? k.page(id) : undefined
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
  return [kindName(s.kind), s.record_id && shortId(s.record_id)].filter(Boolean).join(' · ')
}

/** An account's state, read from its meta or facts, for the dot on its initial. */
export function accountStatus(s: Source): 'active' | 'suspended' | undefined {
  if (kindOf(s.kind) !== 'account') return undefined
  const text = [s.meta, ...(s.facts ?? []).map((f) => f.value)].join(' ')
  return /suspend|banned|locked/i.test(text) ? 'suspended' : 'active'
}

/** Where a source's record opens in the console, if it has a page there. */
export const sourceHref = (s: Source, admin = false) => recordHref(s.kind, s.record_id, admin)

/** "Open account", "Open report case", "Open audit log". */
export const openLabel = (s: Source) => `Open ${kindName(s.kind).toLowerCase()}`

/** A quote cut to the length of a claim, at a line where there is one. */
export function clipped(value: string): string {
  if (value.length <= 240) return value
  const line = value.lastIndexOf('\n', 240)
  return `${value.slice(0, line > 120 ? line : 240).trim()}…`
}

/** "…f9e8": the end of an id, since UUIDv7 ids of one day share their start. */
export const idTail = (id: string) => `…${id.slice(-4)}`
