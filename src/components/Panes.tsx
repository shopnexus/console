import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import IconBack from '~icons/material-symbols-light/arrow-back-rounded'
import IconChevron from '~icons/material-symbols-light/chevron-right-rounded'
import IconOpen from '~icons/material-symbols-light/north-east-rounded'
import { ApiError } from '../lib/api'
import type { PersonStatus } from '../lib/commerce'
import { pickedRow } from '../lib/look'
import { Card, Initial, Kbd } from './ui'

/** The list beside a record (Support, Reports, Accounts): a faint column with its controls on top. */
export function ListColumn({ head, children, foot, width = 'w-[310px]' }: { head: ReactNode; children: ReactNode; foot?: ReactNode; width?: string }) {
  return (
    <section className={`flex shrink-0 flex-col border-r border-hairline bg-surface/60 ${width}`}>
      <div className="space-y-2 p-3">{head}</div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">{children}</div>
      {foot}
    </section>
  )
}

/** "j k  Next, previous" under a list. */
export function JKHint({ children = 'Next, previous' }: { children?: ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 border-t border-hairline px-4 py-3 text-body-small text-on-surface-variant">
      <Kbd>j</Kbd>
      <Kbd>k</Kbd>
      {children}
    </p>
  )
}

/** A row of a list column: the record's initial, name and time, a line, and a foot of small facts. */
export function ListRow({
  on,
  onClick,
  avatar,
  name,
  when,
  line,
  foot,
}: {
  on: boolean
  onClick: () => void
  avatar: ReactNode
  name: ReactNode
  when?: ReactNode
  line?: ReactNode
  foot?: ReactNode
}) {
  return (
    <button type="button" onClick={onClick} className={`flex w-full gap-3 rounded-3xl px-3 py-3 text-left ${pickedRow(on)}`}>
      <span className="relative h-fit shrink-0">{avatar}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-title-small">{name}</span>
          {when !== undefined && <span className="shrink-0 tabular-nums text-label-small font-normal text-on-surface-variant">{when}</span>}
        </span>
        {line !== undefined && <span className="mt-0.5 block truncate text-body-small text-on-surface-variant">{line}</span>}
        {foot && <span className="mt-1.5 flex items-center gap-2 text-label-small font-normal">{foot}</span>}
      </span>
    </button>
  )
}

/** A small fact with a coloured dot, as in a row's foot. */
export function DotFact({ tone, children }: { tone: string; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap text-on-surface-variant">
      <span className={`h-1.5 w-1.5 rounded-full ${tone}`} />
      {children}
    </span>
  )
}

/** The header of a record beside a list: "Accounts › Name", and controls at the end. */
export function Crumbs({ parent, onParent, name, children }: { parent: string; onParent: () => void; name: ReactNode; children?: ReactNode }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 px-6 text-label-medium font-normal text-on-surface-variant">
      <button type="button" onClick={onParent} className="hover:text-on-surface">
        {parent}
      </button>
      <IconChevron width={16} height={16} />
      <span className="min-w-0 flex-1 truncate text-on-surface">{name}</span>
      {children}
    </header>
  )
}

/** A record's hero: a soft teal wash under a dotted grid. A suspended or hidden record says so with its status pill, not a wash. */
export function Hero({ children, className = 'p-5' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`relative overflow-hidden rounded-5xl border border-hairline band ${className}`}>
      <div aria-hidden className="dots pointer-events-none absolute inset-0" />
      <div className="relative">{children}</div>
    </section>
  )
}

/** A label-and-value line in a Details card. */
export function FactRow({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-body-small">
      <span className="text-on-surface-variant">{label}</span>
      <span className="min-w-0 text-right">{children}</span>
    </div>
  )
}

/** A status pill: a dot and the word on white. */
export function StatusPill({ suspended, children }: { suspended: boolean; children: ReactNode }) {
  return (
    <span className="inline-flex h-6 items-center gap-1.5 rounded-full border border-hairline bg-surface-container-lowest px-2.5 text-label-small">
      <span className={`h-1.5 w-1.5 rounded-full ${suspended ? 'bg-error' : 'bg-primary'}`} />
      {children}
    </span>
  )
}

/**
 * The header of a record reached by a link, with no list of its own:
 * Back (to where the member came from, else home) › kind › name, and its
 * actions at the end.
 */
export function BackCrumbs({ kind, name, children }: { kind: string; name: ReactNode; children?: ReactNode }) {
  const navigate = useNavigate()
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 px-6 text-label-medium font-normal text-on-surface-variant">
      <button
        type="button"
        onClick={() => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/'))}
        className="flex h-8 items-center gap-1 rounded-full px-2.5 hover:bg-on-surface/5 hover:text-on-surface"
      >
        <IconBack width={16} height={16} />
        Back
      </button>
      <IconChevron width={16} height={16} />
      {kind}
      <IconChevron width={16} height={16} />
      <span className="min-w-0 flex-1 truncate text-on-surface">{name}</span>
      {children}
    </header>
  )
}

/** "Open ↗" on a card, to the record it names. */
export function OpenLink({ to, label = 'Open' }: { to: string; label?: string }) {
  return (
    <Link to={to} className="flex h-9 shrink-0 items-center gap-1 rounded-full border border-hairline bg-surface-container-lowest px-3 text-label-medium text-primary hover:bg-surface-container-low">
      {label}
      <IconOpen width={14} height={14} />
    </Link>
  )
}

/** A buyer, seller or other account on a record: its initial with the state dot, name, a meta line, and Open. */
export function PartyCard({ role, id, name, status, meta }: { role: string; id: string; name: string; status?: PersonStatus; meta?: ReactNode }) {
  return (
    <Card className="p-4">
      <p className="text-label-small font-normal text-on-surface-variant">{role}</p>
      <div className="mt-2 flex items-center gap-3">
        <Initial name={name} id={id} size={40} status={status ?? 'active'} />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-title-small">{name}</p>
          {meta && <p className="mt-0.5 tabular-nums text-body-small text-on-surface-variant">{meta}</p>}
        </div>
        <OpenLink to={`/accounts/${id}`} />
      </div>
    </Card>
  )
}

/** A record's page that did not load: gone, or not reachable. */
export function Missing({ error, what, gone: goneText, className = '' }: { error: unknown; what: string; gone?: string; className?: string }) {
  const gone = error instanceof ApiError && error.status === 404
  return (
    <div className={`flex flex-1 items-center justify-center text-body-medium text-on-surface-variant ${className}`}>
      {gone ? (goneText ?? `There is no such ${what}.`) : `The ${what} did not load.`}
    </div>
  )
}
