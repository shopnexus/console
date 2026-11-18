import { useState } from 'react'
import IconSearch from '~icons/material-symbols-light/search-rounded'
import IconTicket from '~icons/material-symbols-light/package-2-outline'
import IconFlag from '~icons/material-symbols-light/flag-outline-rounded'
import type { Attachment, AttachmentKind } from '../lib/agent'
import { when } from '../lib/format'
import { useCases } from '../lib/reports'
import { kindChip, useQueue } from '../lib/support'
import { AccountSearch } from './AccountSearch'
import { Segmented } from './ui'

/**
 * The ask box's + and @ menu: an open ticket by the person's name or the
 * ticket's id, a waiting report case, or an account by its exact id, email
 * or phone number.
 */
export function AttachMenu({ onPick }: { onPick: (a: Attachment) => void }) {
  const [tab, setTab] = useState<AttachmentKind>('ticket')
  return (
    <div>
      <Segmented
        full
        label="Attach"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'ticket', label: 'Ticket' },
          { value: 'report_case', label: 'Report' },
          { value: 'account', label: 'Account' },
        ]}
      />
      <div className="mt-1.5">
        {tab === 'ticket' && <TicketPick onPick={onPick} />}
        {tab === 'report_case' && <ReportPick onPick={onPick} />}
        {tab === 'account' && <AccountSearch onPick={(a) => onPick({ kind: 'account', id: a.id, label: `Account · ${a.display_name}` })} />}
      </div>
    </div>
  )
}

function Finder({ q, setQ, label }: { q: string; setQ: (v: string) => void; label: string }) {
  return (
    <div className="flex h-10 items-center gap-2 rounded-xl bg-surface-container-low px-3 text-on-surface-variant">
      <IconSearch width={16} height={16} />
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Name or id"
        aria-label={label}
        className="h-full min-w-0 flex-1 bg-transparent text-body-medium text-on-surface outline-none placeholder:text-on-surface-variant"
      />
    </div>
  )
}

const row = 'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-surface-container-low'

function TicketPick({ onPick }: { onPick: (a: Attachment) => void }) {
  const [q, setQ] = useState('')
  const queue = useQueue('open', null)
  const needle = q.trim().toLowerCase()
  const items = (queue.items ?? []).filter((t) => !needle || t.person.display_name.toLowerCase().includes(needle) || t.ticket.id.startsWith(needle)).slice(0, 6)
  return (
    <div>
      <Finder q={q} setQ={setQ} label="Find a ticket" />
      <p className="px-2 pb-1 pt-2 text-label-small text-on-surface-variant">Open</p>
      {items.map((t) => (
        <button key={t.ticket.id} type="button" onClick={() => onPick({ kind: 'ticket', id: t.ticket.id, label: `Ticket · ${t.person.display_name || 'Deleted'}` })} className={row}>
          <IconTicket width={16} height={16} className="shrink-0 text-on-surface-variant" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-body-medium">{t.person.display_name || 'Deleted'}</span>
            <span className="block text-label-small font-normal tabular-nums text-on-surface-variant">
              {kindChip[t.ticket.kind]} · {when(t.ticket.opened_at)}
            </span>
          </span>
        </button>
      ))}
      {!queue.isPending && items.length === 0 && <p className="px-2 py-2 text-body-medium text-on-surface-variant">No ticket matches.</p>}
    </div>
  )
}

function ReportPick({ onPick }: { onPick: (a: Attachment) => void }) {
  const [q, setQ] = useState('')
  const cases = useCases('open')
  const needle = q.trim().toLowerCase()
  const items = (cases.items ?? []).filter((c) => !needle || c.account.display_name.toLowerCase().includes(needle) || c.account.id.startsWith(needle)).slice(0, 6)
  return (
    <div>
      <Finder q={q} setQ={setQ} label="Find a report case" />
      <p className="px-2 pb-1 pt-2 text-label-small text-on-surface-variant">Waiting</p>
      {items.map((c) => (
        <button key={c.account.id} type="button" onClick={() => onPick({ kind: 'report_case', id: c.account.id, label: `Report · ${c.account.display_name}` })} className={row}>
          <IconFlag width={16} height={16} className="shrink-0 text-error" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-body-medium">{c.account.display_name}</span>
            <span className="block text-label-small font-normal tabular-nums text-on-surface-variant">
              {c.reports === 1 ? '1 report' : `${c.reports} reports`} · {when(c.last_at)}
            </span>
          </span>
        </button>
      ))}
      {!cases.isPending && items.length === 0 && <p className="px-2 py-2 text-body-medium text-on-surface-variant">No case matches.</p>}
    </div>
  )
}
