import { type ReactNode, useState } from 'react'
import { NavLink } from 'react-router'
import IconAccount from '~icons/material-symbols-light/person-outline-rounded'
import IconNew from '~icons/material-symbols-light/edit-square-outline'
import IconOwn from '~icons/material-symbols-light/search-rounded'
import IconTicket from '~icons/material-symbols-light/package-2-outline'
import { type Conversation, type DayGroup, type SubjectKind, dayGroup, threadTitle } from '../lib/agent'
import { Kbd, PickedBar } from './ui'
import { pickedRow } from '../lib/look'

/** The icon of the record a chat is about; a chat without one shows a search. */
export function SubjectIcon({ kind, size = 16 }: { kind?: SubjectKind; size?: number }): ReactNode {
  if (kind === 'ticket') return <IconTicket width={size} height={size} />
  if (kind === 'account') return <IconAccount width={size} height={size} />
  return <IconOwn width={size} height={size} />
}

/** The member's chats, 264 px: "Cuộc mới" (N), a filter, and the chats grouped by day. */
export function ThreadList({ items, onNew, fresh }: { items: Conversation[]; onNew: () => void; fresh: boolean }) {
  const [q, setQ] = useState('')
  const needle = q.trim().toLowerCase()
  const groups = new Map<DayGroup, Conversation[]>()
  for (const c of items) {
    if (needle && !threadTitle(c).toLowerCase().includes(needle)) continue
    const g = dayGroup(c.updated_at)
    groups.set(g, [...(groups.get(g) ?? []), c])
  }
  return (
    <section className="flex w-[264px] shrink-0 flex-col border-r border-hairline p-2">
      <button
        onClick={onNew}
        className={`flex h-8 items-center gap-2 rounded-sm bg-on-surface px-3 text-label-large text-surface ${fresh ? 'ring-4 ring-on-surface/10' : ''}`}
      >
        <IconNew width={16} height={16} />
        Cuộc mới
        <span className="ml-auto">
          <Kbd>N</Kbd>
        </span>
      </button>
      <label className="mt-2 flex h-8 items-center gap-2 rounded-sm border border-hairline px-2 text-on-surface-variant focus-within:border-outline">
        <IconOwn width={16} height={16} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm cuộc trò chuyện"
          className="h-full min-w-0 flex-1 bg-transparent text-body-medium text-on-surface outline-none placeholder:text-on-surface-variant"
        />
      </label>
      <nav className="min-h-0 flex-1 overflow-y-auto" aria-label="Cuộc trò chuyện">
        {[...groups].map(([day, rows]) => (
          <div key={day}>
            <p className="px-2 pb-1 pt-4 text-label-small text-on-surface-variant">{day}</p>
            {rows.map((c) => (
              <NavLink
                key={c.id}
                to={`/agent/${c.id}`}
                title={threadTitle(c)}
                className={({ isActive }) => `flex h-8 items-center gap-2 rounded-sm px-2 text-body-medium ${pickedRow(isActive)}`}
              >
                {({ isActive }) => (
                  <>
                    <PickedBar on={isActive} />
                    <span className={isActive ? 'text-primary' : 'text-on-surface-variant'}>
                      <SubjectIcon kind={c.subject_kind} />
                    </span>
                    <span className="min-w-0 flex-1 truncate">{threadTitle(c)}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </section>
  )
}
