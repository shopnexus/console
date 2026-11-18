import type { ReactNode } from 'react'
import IconChevron from '~icons/material-symbols-light/chevron-right-rounded'
import { pickedRow } from '../lib/look'
import { Kbd } from './ui'

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

/** A record's hero: two soft washes under a dotted grid, in `error` for a suspended account. */
export function Hero({ error = false, children, className = 'p-5' }: { error?: boolean; children: ReactNode; className?: string }) {
  return (
    <section className={`relative overflow-hidden rounded-5xl border border-hairline ${error ? 'band-error' : 'band'} ${className}`}>
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
