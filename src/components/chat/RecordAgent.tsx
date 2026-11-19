import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import IconAdd from '~icons/material-symbols-light/add-rounded'
import IconClose from '~icons/material-symbols-light/close-rounded'
import IconExpand from '~icons/material-symbols-light/keyboard-arrow-down-rounded'
import IconSearch from '~icons/material-symbols-light/search-rounded'
import { type Attachment, isTempChat, threadTitle, useMentionThreads, useThreads } from '../../lib/agent'
import { type Command, recordTabs, stepTab } from '../../lib/commands'
import { typing, useDismiss } from '../../lib/dom'
import { when } from '../../lib/format'
import type { NearRecords } from '../AttachMenu'
import { RecordIcon } from '../kindLook'
import { Kbd, Notice } from '../ui'
import { ChatView } from './Chat'

const isDraft = (id: string) => id.startsWith('draft-')

const closedKey = (r: Attachment) => `agent-tabs-closed:${r.kind}:${r.id}`

function readClosed(r: Attachment): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(closedKey(r)) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}

function writeClosed(r: Attachment, ids: Set<string>) {
  try {
    // Only stored chats come back after a reload; drafts and temporary ids do not.
    localStorage.setItem(closedKey(r), JSON.stringify([...ids].filter((id) => !isDraft(id) && !isTempChat(id)).slice(-50)))
  } catch {
    // Private windows refuse storage; closed tabs then come back on reload.
  }
}

const newDraft = () => `draft-${crypto.randomUUID()}`

/**
 * The agent beside a record: one tab per chat of the member's that mentions
 * the record, each an ordinary chat in the history. A new tab starts with the
 * record in its ask box. Ctrl [ and Ctrl ] move between tabs, Ctrl K opens
 * the switcher, N opens a tab; /new, /clear and /close work in the box.
 */
export function RecordAgent({
  record,
  here,
  starters,
  commands = [],
  onReply,
}: {
  record: Attachment
  here?: NearRecords
  starters: string[]
  /** The page's own commands, after /new, /clear and /close. */
  commands?: Command[]
  onReply?: (text: string) => void
}) {
  const threads = useMentionThreads(record.kind, record.id)
  const [closed, setClosed] = useState(() => readClosed(record))
  const [fresh, setFresh] = useState<string[]>([])
  const [active, setActive] = useState<string>()
  const [switcher, setSwitcher] = useState(false)
  // The question a tab made by "/new question" asks as it opens.
  const [firstAsks, setFirstAsks] = useState<Record<string, string>>({})
  // A record with no open tab shows one new tab; clearing or using it makes the next one.
  const [seed, setSeed] = useState(newDraft)
  const items = useMemo(() => threads.data?.items ?? [], [threads.data])
  const tabs = useMemo(() => {
    const t = recordTabs(items, closed, fresh)
    return t.length === 0 && !threads.isPending ? [seed] : t
  }, [items, closed, fresh, threads.isPending, seed])
  const byId = useMemo(() => new Map(items.map((c) => [c.id, c])), [items])
  // A chat's move to its real id lands after the render that asked; these hold what is true then.
  const now = useRef({ closed, seed })
  useEffect(() => {
    now.current = { closed, seed }
  })

  // The shown seed tab stays when another one opens.
  const seedShown = tabs[0] === seed
  const newTab = useCallback(
    (ask?: string, keepSeed = true) => {
      const id = newDraft()
      if (ask) setFirstAsks((f) => ({ ...f, [id]: ask }))
      setFresh((f) => [...(keepSeed && seedShown && !f.includes(seed) ? [seed] : []), ...f, id])
      setActive(id)
    },
    [seedShown, seed],
  )

  // A record opens on its newest chat.
  const current = active && tabs.includes(active) ? active : tabs.at(-1)

  const markClosed = useCallback(
    (id: string) =>
      setClosed((c) => {
        const n = new Set(c).add(id)
        writeClosed(record, n)
        return n
      }),
    [record],
  )

  // A closed tab's chat stays in the history; the next tab takes its place.
  const closeTab = useCallback(
    (id: string) => {
      const rest = tabs.filter((t) => t !== id)
      setFresh((f) => f.filter((x) => x !== id))
      markClosed(id)
      if (id === seed) setSeed(newDraft())
      if (id === current) setActive(rest[Math.min(tabs.indexOf(id), rest.length - 1)])
    },
    [tabs, current, seed, markClosed],
  )

  // A tab's chat moves from its draft to a temporary id, then to the stored one; one closed meanwhile stays closed.
  const moved = useCallback(
    (from: string, to: string) => {
      if (now.current.closed.has(from)) {
        markClosed(to)
        return
      }
      if (from === now.current.seed) setSeed(newDraft())
      setFresh((f) => (f.includes(from) ? f.map((x) => (x === from ? to : x)) : [...f, to]))
      setActive((a) => (a === from ? to : a))
    },
    [markClosed],
  )

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey && !e.altKey && !e.shiftKey && (e.key === '[' || e.key === ']')) {
        e.preventDefault()
        setActive(stepTab(tabs, current, e.key === ']' ? 1 : -1))
      } else if (e.ctrlKey && !e.altKey && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        setSwitcher((o) => !o)
      } else if ((e.key === 'n' || e.key === 'N') && !typing(e)) {
        // Before the nav's N, which opens a chat on its own page.
        e.preventDefault()
        newTab()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [tabs, current, newTab])

  const all: Command[] = [
    { name: 'new', arg: 'question', description: 'New tab about this, asks right away', run: (arg) => newTab(arg || undefined) },
    {
      name: 'clear',
      description: 'Start this tab over; the old chat stays in the history',
      run: () => {
        if (!current) return
        closeTab(current)
        newTab(undefined, current !== seed)
      },
    },
    { name: 'close', description: 'Close this tab', run: () => current && closeTab(current) },
    ...commands,
  ]

  const title = (id: string) => {
    const c = byId.get(id)
    return c ? threadTitle(c) : 'New chat'
  }

  return (
    <div data-agent-panel className="relative flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-1 border-b border-hairline px-2.5 py-2">
        <div role="tablist" aria-label="Agent chats" className="flex min-w-0 flex-1 gap-1">
          {tabs.map((id, i) => {
            const on = id === current
            return (
              <div key={id} className={`group relative flex h-9 items-center rounded-xl ${on ? 'shrink-0 bg-surface-container-lowest shadow-soft' : 'min-w-0 flex-1 basis-0 hover:bg-on-surface/5'}`}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={on}
                  title={i < 9 ? `${title(id)} · Ctrl K then ${i + 1}` : title(id)}
                  onClick={() => setActive(id)}
                  className={`flex h-full min-w-0 flex-1 items-center gap-1.5 pl-2.5 pr-6 text-label-medium ${on ? 'font-medium text-on-surface' : 'font-normal text-on-surface-variant'}`}
                >
                  <span className="tabular-nums text-label-small font-normal text-on-surface-variant/70">{i + 1}</span>
                  <span className={on ? 'max-w-[180px] truncate' : 'truncate'}>{title(id)}</span>
                </button>
                <button
                  type="button"
                  title="Close tab"
                  aria-label="Close tab"
                  onClick={() => closeTab(id)}
                  className="absolute right-1 hidden h-6 w-6 items-center justify-center rounded-full text-on-surface-variant hover:bg-on-surface/8 group-hover:flex"
                >
                  <IconClose width={14} height={14} />
                </button>
              </div>
            )
          })}
        </div>
        <button type="button" title="New tab (N)" aria-label="New tab" onClick={() => newTab()} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-on-surface-variant hover:bg-on-surface/5">
          <IconAdd width={19} height={19} />
        </button>
        <button
          type="button"
          title="All chats (Ctrl K)"
          aria-label="All chats"
          aria-expanded={switcher}
          onClick={() => setSwitcher((o) => !o)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-on-surface-variant hover:bg-on-surface/5"
        >
          <IconExpand width={19} height={19} />
        </button>
      </div>
      {threads.isError && (
        <div className="px-3 pt-3">
          <Notice>The chats about this did not load.</Notice>
        </div>
      )}
      {switcher && <Switcher tabs={tabs} title={title} onPick={setActive} onNew={() => newTab()} onClose={() => setSwitcher(false)} />}
      {current && (
        <ChatView
          key={current}
          compact
          conversationId={isDraft(current) ? undefined : current}
          attach={[record]}
          here={here}
          commands={all}
          onReply={onReply}
          firstAsk={firstAsks[current]}
          onCreated={(temp) => moved(current, temp)}
          onReady={(real, temp) => moved(temp, real)}
          placeholder="Ask, / for commands, @ to mention"
          empty={(box, ask) => (
            <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto px-3 pb-3">
              <span className="flex-1" />
              <div className="flex flex-col items-center pb-4 text-center">
                <img src="/art-ai-reading.webp" alt="" className="h-[72px] w-[72px] animate-rise object-contain" />
                <p className="mt-2 text-title-small">New chat</p>
                <p className="mt-1 inline-flex items-center gap-1.5 text-body-small text-on-surface-variant">
                  <RecordIcon kind={record.kind} size={14} />
                  {record.label}
                </p>
              </div>
              <div className="rise-list mb-3 space-y-1.5">
                {starters.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => ask(s)}
                    className="block w-full rounded-2xl border border-hairline bg-surface-container-lowest px-3.5 py-2.5 text-left text-body-medium hover:border-primary/30"
                  >
                    {s}
                  </button>
                ))}
              </div>
              {box}
            </section>
          )}
        />
      )}
      <p className="flex shrink-0 items-center gap-1 whitespace-nowrap px-4 pb-3 text-label-small font-normal text-on-surface-variant">
        <Kbd>Ctrl [ ]</Kbd>Tabs<span className="mx-1.5 text-outline-variant">·</span>
        <Kbd>Ctrl K</Kbd>Chats<span className="mx-1.5 text-outline-variant">·</span>
        <Kbd>Ctrl /</Kbd>Reply box
      </p>
    </div>
  )
}

/** Ctrl K: the record's tabs with 1 to 9, then the member's other chats, filtered as they type. */
function Switcher({ tabs, title, onPick, onNew, onClose }: { tabs: string[]; title: (id: string) => string; onPick: (id: string) => void; onNew: () => void; onClose: () => void }) {
  const navigate = useNavigate()
  const threads = useThreads()
  const [q, setQ] = useState('')
  const ref = useDismiss<HTMLDivElement>(true, onClose)
  const needle = q.trim().toLowerCase()
  const mine = tabs.map((id, i) => ({ id, i, t: title(id) })).filter((x) => !needle || x.t.toLowerCase().includes(needle))
  const others = threads.items.filter((c) => !tabs.includes(c.id) && (!needle || threadTitle(c).toLowerCase().includes(needle))).slice(0, 6)
  const pick = (id: string) => {
    onPick(id)
    onClose()
  }
  const row = 'flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left hover:bg-surface-container-low'
  return (
    <div ref={ref} className="absolute inset-x-2 top-14 z-40 animate-pop overflow-hidden rounded-4xl border border-hairline bg-surface-container-lowest shadow-float">
      <div className="flex items-center gap-2 border-b border-hairline px-4 py-3 text-on-surface-variant">
        <IconSearch width={18} height={18} />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            const n = Number(e.key)
            if (!q && n >= 1 && n <= 9 && tabs[n - 1]) {
              e.preventDefault()
              pick(tabs[n - 1])
            } else if (e.key === 'Enter' && mine[0]) pick(mine[0].id)
            else if (e.key === 'Escape') onClose()
          }}
          placeholder="Find a chat"
          aria-label="Find a chat"
          className="h-6 min-w-0 flex-1 bg-transparent text-body-medium text-on-surface outline-none placeholder:text-on-surface-variant/80"
        />
        <Kbd>Esc</Kbd>
      </div>
      <div className="max-h-[420px] overflow-y-auto p-1.5">
        <p className="px-3 pb-1 pt-1.5 text-label-small text-on-surface-variant">Here</p>
        {mine.map((x) => (
          <button key={x.id} type="button" onClick={() => pick(x.id)} className={row}>
            <span className="min-w-0 flex-1 truncate text-body-medium">{x.t}</span>
            {x.i < 9 && <Kbd>{x.i + 1}</Kbd>}
          </button>
        ))}
        {others.length > 0 && <p className="px-3 pb-1 pt-2.5 text-label-small text-on-surface-variant">Other chats</p>}
        {others.map((c) => (
          <button key={c.id} type="button" onClick={() => navigate(`/agent/${c.id}`)} className={row}>
            <span className="shrink-0 text-on-surface-variant">
              <RecordIcon kind={c.subject_kind} size={16} />
            </span>
            <span className="min-w-0 flex-1 truncate text-body-medium">{threadTitle(c)}</span>
            <span className="tabular-nums text-label-small font-normal text-on-surface-variant">{when(c.updated_at)}</span>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-4 border-t border-hairline bg-surface-container-low/60 px-4 py-2.5 text-label-small font-normal text-on-surface-variant">
        <span className="flex items-center gap-1">
          <Kbd>1</Kbd>–<Kbd>9</Kbd>Jump
        </span>
        <button type="button" onClick={() => { onNew(); onClose() }} className="flex items-center gap-1 hover:text-on-surface">
          <IconAdd width={15} height={15} />
          New tab
        </button>
      </div>
    </div>
  )
}
