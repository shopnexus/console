import { useState } from 'react'
import IconCheck from '~icons/material-symbols-light/check-rounded'
import IconSearch from '~icons/material-symbols-light/search-rounded'
import IconTicket from '~icons/material-symbols-light/package-2-outline'
import type { SubjectKind } from '../lib/agent'
import { kindChip, useQueue } from '../lib/support'
import { AccountSearch } from './AccountSearch'
import { when } from '../lib/format'


/**
 * The ask box's + menu: an open ticket, by the person's name or the
 * ticket's id, or an account by its exact id, email or phone number.
 */
export function AttachMenu({
  selected,
  onPick,
}: {
  selected?: { kind: SubjectKind; id: string }
  onPick: (kind: SubjectKind, id: string) => void
}) {
  const [tab, setTab] = useState<SubjectKind>(selected?.kind ?? 'ticket')
  const tabs: [SubjectKind, string][] = [
    ['ticket', 'Ticket'],
    ['account', 'Account'],
  ]
  return (
    <div>
      <div className="flex rounded-full bg-surface-container p-1 text-label-medium">
        {tabs.map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`flex h-8 flex-1 items-center justify-center rounded-full px-2 ${
              tab === k ? 'animate-thumb bg-surface-container-lowest shadow-soft' : 'text-on-surface-variant'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mt-1.5">
        {tab === 'ticket' ? (
          <TicketPick selected={selected?.kind === 'ticket' ? selected.id : undefined} onPick={(id) => onPick('ticket', id)} />
        ) : (
          <AccountSearch selected={selected?.kind === 'account' ? selected.id : undefined} onPick={(a) => onPick('account', a.id)} />
        )}
      </div>
    </div>
  )
}

function TicketPick({ selected, onPick }: { selected?: string; onPick: (id: string) => void }) {
  const [q, setQ] = useState('')
  const queue = useQueue('open', null)
  const needle = q.trim().toLowerCase()
  const items = (queue.items ?? [])
    .filter((t) => !needle || t.person.display_name.toLowerCase().includes(needle) || t.ticket.id.startsWith(needle))
    .slice(0, 6)
  return (
    <div>
      <div className="flex h-10 items-center gap-2 rounded-xl bg-surface-container-low px-3 text-on-surface-variant">
        <IconSearch width={16} height={16} />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Name or id"
          aria-label="Find a ticket"
          className="h-full min-w-0 flex-1 bg-transparent text-body-medium text-on-surface outline-none placeholder:text-on-surface-variant"
        />
      </div>
      <p className="px-2 pb-1 pt-2 text-label-small text-on-surface-variant">Open</p>
      {items.map((t) => (
        <button
          key={t.ticket.id}
          type="button"
          onClick={() => onPick(t.ticket.id)}
          className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left ${
            t.ticket.id === selected ? 'bg-surface-container' : 'hover:bg-surface-container-low'
          }`}
        >
          <IconTicket width={16} height={16} className="shrink-0 text-on-surface-variant" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-body-medium">{t.person.display_name || 'Deleted'}</span>
            <span className="block text-label-small font-normal tabular-nums text-on-surface-variant">
              {kindChip[t.ticket.kind]} · {when(t.ticket.opened_at)}
            </span>
          </span>
          {t.ticket.id === selected && <IconCheck width={16} height={16} className="text-primary" />}
        </button>
      ))}
      {!queue.isPending && items.length === 0 && (
        <p className="px-2 py-2 text-body-medium text-on-surface-variant">No ticket matches.</p>
      )}
    </div>
  )
}
