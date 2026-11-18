import { useState } from 'react'
import { useNavigate } from 'react-router'
import IconChat from '~icons/material-symbols-light/chat-outline-rounded'
import IconSearch from '~icons/material-symbols-light/search-rounded'
import { rememberAccount, useAccountSearch, useRecentAccounts } from '../lib/accounts'
import { threadTitle, useThreads } from '../lib/agent'
import { AccountRow } from './AccountSearch'

/**
 * Search: the member's chats whose title has the words, as they type, and on
 * Enter the account with that exact id, email or phone number. Before any
 * words it lists the accounts opened last.
 */
export function SearchMenu({ onDone }: { onDone: () => void }) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [asked, setAsked] = useState('')
  const threads = useThreads()
  const found = useAccountSearch(asked)
  const recent = useRecentAccounts()
  const needle = q.trim().toLowerCase()
  const chats = needle ? threads.items.filter((c) => threadTitle(c).toLowerCase().includes(needle)).slice(0, 6) : []
  const accounts = asked ? (found.data?.items ?? []) : needle ? [] : recent.slice(0, 5)

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          setAsked(q.trim())
        }}
        className="flex h-10 items-center gap-2 rounded-xl bg-surface-container-low px-3 text-on-surface-variant"
      >
        <IconSearch width={18} height={18} />
        <input
          autoFocus
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            if (e.target.value === '') setAsked('')
          }}
          placeholder="Chats, or an account's id, email or phone"
          aria-label="Search"
          className="h-full min-w-0 flex-1 bg-transparent text-body-medium text-on-surface outline-none placeholder:text-on-surface-variant"
        />
      </form>
      {chats.length > 0 && (
        <div className="rise-list mt-1">
          <p className="px-2.5 pb-1 pt-2 text-label-small font-normal text-on-surface-variant">Chats</p>
          {chats.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                onDone()
                navigate(`/agent/${c.id}`)
              }}
              className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-body-medium hover:bg-surface-container-low"
            >
              <IconChat width={16} height={16} className="shrink-0 text-on-surface-variant" />
              <span className="truncate">{threadTitle(c)}</span>
            </button>
          ))}
        </div>
      )}
      <div key={asked} className="rise-list mt-1">
        {accounts.length > 0 && (
          <p className="px-2.5 pb-1 pt-2 text-label-small font-normal text-on-surface-variant">{asked ? 'Accounts' : 'Opened lately'}</p>
        )}
        {accounts.map((a) => (
          <AccountRow
            key={a.id}
            a={a}
            onClick={() => {
              rememberAccount(a)
              onDone()
              navigate(`/accounts/${a.id}`)
            }}
          />
        ))}
        {asked && found.data && found.data.items.length === 0 && (
          <p className="px-2.5 py-2 text-body-medium text-on-surface-variant">No account matches.</p>
        )}
        {needle && !asked && chats.length === 0 && (
          <p className="px-2.5 py-2 text-body-small text-on-surface-variant">Enter looks up an account.</p>
        )}
      </div>
    </div>
  )
}
