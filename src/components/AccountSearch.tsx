import { type ReactNode, type Ref, useState } from 'react'
import IconSearch from '~icons/material-symbols-light/search-rounded'
import { type Account, shortId } from '../lib/api'
import { useAccountSearch, useRecentAccounts } from '../lib/accounts'
import { Initial } from './ui'
import { pickedRow } from '../lib/look'

const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' })

/** The line under an account's name: since when, or how long it is suspended and why. */
function accountLine(a: Account): string {
  if (a.status !== 'suspended') return `Since ${day.format(new Date(a.created_at))}`
  const until = a.suspended_until ? `until ${day.format(new Date(a.suspended_until))}` : 'with no end'
  return [`Suspended ${until}`, a.suspend_reason].filter(Boolean).join(' · ')
}

/** One account in a list: initial, name, short id and the status line. */
export function AccountRow({ a, right, selected, onClick }: { a: Account; right?: ReactNode; selected?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left ${pickedRow(!!selected)}`}
    >
      <Initial name={a.display_name} id={a.id} size={30} status={a.status} />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="truncate text-label-large">{a.display_name}</span>
          <span className="tabular-nums text-body-small text-on-surface-variant">{shortId(a.id)}</span>
        </span>
        <span className={`block truncate text-body-small ${a.status === 'suspended' ? 'text-error' : 'text-on-surface-variant'}`}>
          {accountLine(a)}
        </span>
      </span>
      {right}
    </button>
  )
}

/**
 * Finds an account by its id, email or phone number, exactly, on Enter.
 * Before a search it lists the accounts opened last. The nav's search and
 * the agent's + menu share it.
 */
export function AccountSearch({
  onPick,
  selected,
  inputRef,
}: {
  onPick: (a: Account) => void
  selected?: string
  inputRef?: Ref<HTMLInputElement>
}) {
  const [q, setQ] = useState('')
  const [asked, setAsked] = useState('')
  const result = useAccountSearch(asked)
  const recent = useRecentAccounts()
  const row = (a: Account) => <AccountRow key={a.id} a={a} selected={a.id === selected} onClick={() => onPick(a)} />
  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          setAsked(q.trim())
        }}
        className="flex h-10 items-center gap-2 rounded-xl bg-surface-container-low px-3 text-on-surface-variant"
      >
        <IconSearch width={16} height={16} />
        <input
          ref={inputRef}
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Id, email or phone number"
          aria-label="Find an account"
          className="h-full min-w-0 flex-1 bg-transparent text-body-medium text-on-surface outline-none placeholder:text-on-surface-variant"
        />
      </form>
      <div key={asked} className="rise-list mt-1">
        {asked !== '' ? (
          result.isPending ? null : result.data?.items.length ? (
            result.data.items.map(row)
          ) : (
            <p className="px-2 py-2 text-body-medium text-on-surface-variant">No account matches.</p>
          )
        ) : (
          recent.length > 0 && (
            <>
              <p className="px-2 pb-1 pt-2 text-label-small text-on-surface-variant">Opened lately</p>
              {recent.slice(0, 5).map(row)}
            </>
          )
        )}
      </div>
    </div>
  )
}
