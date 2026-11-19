import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router'
import IconApps from '~icons/material-symbols-light/apps-rounded'
import IconChevron from '~icons/material-symbols-light/chevron-right-rounded'
import IconCollapse from '~icons/material-symbols-light/left-panel-close-outline-rounded'
import IconExpand from '~icons/material-symbols-light/left-panel-open-outline-rounded'
import IconLock from '~icons/material-symbols-light/lock-outline'
import IconLogout from '~icons/material-symbols-light/logout-rounded'
import IconNew from '~icons/material-symbols-light/edit-square-outline'
import IconOpen from '~icons/material-symbols-light/north-east-rounded'
import IconSearch from '~icons/material-symbols-light/search-rounded'
import IconSettings from '~icons/material-symbols-light/tune-rounded'
import IconUnfold from '~icons/material-symbols-light/unfold-more-rounded'
import { post, roleName } from '../lib/api'
import { type Conversation, type DayGroup, dayGroup, threadTitle, useThreads } from '../lib/agent'
import { dashboards, mayOpen } from '../lib/dashboards'
import { typing, useAnchor, useDismiss } from '../lib/dom'
import { navigation, useNavCollapsed } from '../lib/navigation'
import { useCases } from '../lib/reports'
import { useForgetMe, useMe } from '../lib/session'
import { useOpenCount } from '../lib/support'
import { ChatMenu } from './chat/ChatMenu'
import { SearchMenu } from './SearchMenu'
import { Initial, Kbd, ThemeSwitch } from './ui'

/**
 * The console's shell: one 272 px sidebar on the page colour beside the
 * white page. The sidebar holds New chat, Search, the work areas, Tools, the
 * member's chats by day, Settings for admins and the member. It collapses to
 * a 64 px rail with the button beside the name or with "["; railFirst starts
 * it collapsed on a page with panes of its own. A title puts a 56 px header
 * on the page; without one the page fills the space itself.
 */
export function Shell({
  title,
  actions,
  railFirst = false,
  children,
}: {
  title?: ReactNode
  actions?: ReactNode
  railFirst?: boolean
  children: ReactNode
}) {
  const [rail, toggle] = useNavCollapsed(railFirst)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== '[' || typing(e)) return
      toggle()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle])

  return (
    <div className="flex h-dvh bg-surface-container-lowest text-on-surface">
      <Sidebar rail={rail} toggle={toggle} />
      <div className="vt-work flex min-w-0 flex-1 flex-col overflow-hidden bg-surface-container-lowest">
        {title && (
          <header className="flex h-14 shrink-0 items-center gap-3 px-6">
            <h1 className="min-w-0 flex-1 truncate text-title-small">{title}</h1>
            {actions}
          </header>
        )}
        <main className="flex min-h-0 flex-1">{children}</main>
      </div>
    </div>
  )
}

/** One row shape for every entry: 36 px with the label, or a 40 px square with the label as its title on the rail. */
function rowClass(rail: boolean, on = false) {
  return `relative isolate flex items-center gap-3 rounded-lg text-label-medium ${rail ? 'h-10 w-10 justify-center' : 'h-9 px-2.5'} ${
    on ? 'font-medium text-on-surface [&>svg]:text-primary' : 'text-on-surface-variant hover:bg-on-surface/5'
  }`
}

function Sidebar({ rail, toggle }: { rail: boolean; toggle: () => void }) {
  const me = useMe()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const openTickets = useOpenCount()
  const openCases = useCases('open')
  const label = (text: string) => labelOf(rail, text)
  const newChat = useCallback(() => navigate('/', { viewTransition: true }), [navigate])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // A page that took N for itself (a record's agent tabs) has prevented it.
      if ((e.key === 'n' || e.key === 'N') && !typing(e) && !e.defaultPrevented) {
        e.preventDefault()
        newChat()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [newChat])

  return (
    <nav
      className={`flex shrink-0 flex-col overflow-hidden border-r border-hairline bg-surface pb-3 pt-3 transition-[width] duration-(--duration-spatial-default) ease-spatial ${
        rail ? 'w-16 items-center px-2' : 'w-[272px] px-3'
      }`}
    >
      <div className={`flex items-center ${rail ? 'flex-col gap-2' : 'h-10 gap-2 px-1.5'}`}>
        <img src="/favicon.svg" alt="ShopNexus" className="h-7 w-7 shrink-0 rounded-md" />
        {!rail && <span className="flex-1 animate-fade text-title-small">ShopNexus</span>}
        <button
          title={rail ? 'Expand ([)' : 'Collapse ([)'}
          aria-label={rail ? 'Expand the sidebar' : 'Collapse the sidebar'}
          onClick={toggle}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-on-surface-variant hover:bg-on-surface/5"
        >
          {rail ? <IconExpand width={18} height={18} /> : <IconCollapse width={18} height={18} />}
        </button>
      </div>
      <button onClick={newChat} title={rail ? 'New chat (N)' : undefined} className={`mt-3 ${rowClass(rail, pathname === '/')}`}>
        {pathname === '/' && <span aria-hidden className="vt-pill absolute inset-0 -z-10 rounded-lg bg-on-surface/6" />}
        <IconNew width={19} height={19} />
        {label('New chat')}
        {!rail && (
          <span className="opacity-70">
            <Kbd>N</Kbd>
          </span>
        )}
      </button>
      <SearchRow rail={rail} />
      <span className={`my-2 h-px shrink-0 bg-outline-variant/40 ${rail ? 'w-6' : 'w-full'}`} />
      <div className={`space-y-0.5 ${rail ? 'flex flex-col items-center' : ''}`}>
        {navigation.map((n) => {
          const count = n.to === '/support' ? openTickets.data?.open || 0 : n.to === '/reports' ? openCases.total || 0 : 0
          return (
            <NavLink key={n.to} to={n.to} viewTransition title={rail ? n.label : undefined} className={({ isActive }) => rowClass(rail, isActive)}>
              {({ isActive }) => (
                <>
                  {/* The pill slides between rows on a route change (vt-pill in tokens.css). */}
                  {isActive && <span aria-hidden className="vt-pill absolute inset-0 -z-10 rounded-lg bg-on-surface/6" />}
                  {n.icon}
                  {label(n.label)}
                  {count > 0 &&
                    (rail ? (
                      <span
                        key={count}
                        className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 animate-badge items-center justify-center rounded-full bg-primary px-1 text-label-small tabular-nums text-on-primary"
                      >
                        {count}
                      </span>
                    ) : (
                      <span key={count} className="animate-badge rounded-full bg-primary/10 px-1.5 text-label-small tabular-nums text-primary">
                        {count}
                      </span>
                    ))}
                </>
              )}
            </NavLink>
          )
        })}
        <ToolsRow rail={rail} />
      </div>
      {rail ? <span className="flex-1" /> : <Chats />}
      {me.role === 'admin' && (
        <NavLink to="/settings" viewTransition title={rail ? 'Settings' : undefined} className={`mt-1 ${rowClass(rail)}`}>
          <IconSettings width={19} height={19} />
          {label('Settings')}
          {!rail && <IconChevron width={16} height={16} />}
        </NavLink>
      )}
      <MemberMenu rail={rail} />
    </nav>
  )
}

/** The member's chats, grouped by day, under the work areas. */
function Chats() {
  const threads = useThreads()
  const groups = useMemo(() => {
    const m = new Map<DayGroup, Conversation[]>()
    for (const c of threads.items) {
      const g = dayGroup(c.updated_at)
      const rows = m.get(g)
      if (rows) rows.push(c)
      else m.set(g, [c])
    }
    return m
  }, [threads.items])
  return (
    <div className="mt-3 min-h-0 flex-1 overflow-y-auto [mask-image:linear-gradient(to_bottom,black_88%,transparent)]" aria-label="Chats">
      <div className="rise-list pb-6">
        {[...groups].map(([day, rows]) => (
          <div key={day}>
            <p className="px-2.5 pb-1 pt-4 text-label-small font-normal text-on-surface-variant/80">{day}</p>
            {rows.map((c) => (
              <div key={c.id} className="group relative">
                <NavLink
                  to={`/agent/${c.id}`}
                  title={threadTitle(c)}
                  className={({ isActive }) =>
                    `block truncate rounded-lg py-2 pl-2.5 pr-9 text-label-medium font-normal ${isActive ? 'bg-on-surface/6 font-medium' : 'hover:bg-on-surface/5'}`
                  }
                >
                  {threadTitle(c)}
                </NavLink>
                <span className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100">
                  <ChatMenu c={c} />
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Search with "/": chats by title, and an account by id, email or phone on Enter. */
function SearchRow({ rail }: { rail: boolean }) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const ref = useDismiss<HTMLDivElement>(open, close)
  const at = useAnchor(ref, open, 'below')
  const onAccounts = useLocation().pathname.startsWith('/accounts')
  const start = useCallback(() => {
    // Accounts has its own search, which "/" focuses there.
    const own = onAccounts ? document.getElementById('account-find') : null
    if (own) own.focus()
    else setOpen((o) => !o)
  }, [onAccounts])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !typing(e)) {
        e.preventDefault()
        start()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [start])
  return (
    <div ref={ref} className={rail ? '' : 'w-full'}>
      <button onClick={start} title={rail ? 'Search (/)' : undefined} aria-expanded={open} className={`${rowClass(rail, open)} ${rail ? '' : 'w-full'}`}>
        <IconSearch width={19} height={19} />
        {!rail && (
          <>
            <span className="flex-1 text-left">Search</span>
            {!onAccounts && (
              <span className="opacity-70">
                <Kbd>/</Kbd>
              </span>
            )}
          </>
        )}
      </button>
      {open && (
        <div style={at} className="fixed z-30 w-[380px] origin-top-left animate-pop rounded-4xl border border-hairline bg-surface-container-lowest p-2 shadow-float">
          <SearchMenu onDone={close} />
        </div>
      )}
    </div>
  )
}

/** Tools: the ops dashboards in a menu, each with ↗, or a lock below the member's role. */
function ToolsRow({ rail }: { rail: boolean }) {
  const me = useMe()
  // Floors come with the session (GET /console/me); the built-in list stands in for a server that sends none.
  const list = dashboards.map((d) => ({ ...d, floor: me.dashboards?.find((f) => f.app === d.app)?.floor ?? d.floor }))
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const ref = useDismiss<HTMLDivElement>(open, close)
  const at = useAnchor(ref, open, 'below')
  return (
    <div ref={ref}>
      <button onClick={() => setOpen((o) => !o)} title={rail ? 'Tools' : undefined} aria-expanded={open} className={`${rowClass(rail, open)} ${rail ? '' : 'w-full'}`}>
        <IconApps width={19} height={19} />
        {labelOf(rail, 'Tools')}
        {!rail && <IconChevron width={16} height={16} />}
      </button>
      {open && (
        <div style={at} className="fixed z-30 w-[240px] origin-top-left animate-pop rounded-3xl border border-hairline bg-surface-container-lowest p-1.5 shadow-float">
          {list.map((d) =>
            mayOpen(me.role, d) ? (
              <a
                key={d.app}
                href={`/dashboards/open?app=${d.app}`}
                target="_blank"
                rel="noreferrer"
                onClick={close}
                className="flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-label-medium hover:bg-surface-container-low"
              >
                <span className="text-primary">{d.icon}</span>
                <span className="flex-1">{d.name}</span>
                <IconOpen width={15} height={15} className="text-on-surface-variant" />
              </a>
            ) : (
              <span key={d.app} title={`${roleName.admin}s only`} className="flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-label-medium text-outline">
                {d.icon}
                <span className="flex-1">{d.name}</span>
                <IconLock width={15} height={15} />
              </span>
            ),
          )}
        </div>
      )}
    </div>
  )
}

function labelOf(rail: boolean, text: string) {
  return rail ? null : <span className="min-w-0 flex-1 animate-fade truncate text-left">{text}</span>
}

/** The member at the bottom of the sidebar, with the theme and sign-out in a menu. */
export function MemberMenu({ rail }: { rail: boolean }) {
  const me = useMe()
  const navigate = useNavigate()
  const forget = useForgetMe()
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const ref = useDismiss<HTMLDivElement>(open, close)
  const at = useAnchor(ref, open, 'above')

  async function signOut() {
    await post('/console/logout').catch(() => undefined)
    forget()
    navigate('/signin', { replace: true })
  }

  return (
    <div ref={ref} className={`mt-1 ${rail ? '' : 'w-full'}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        title={rail ? `${me.display_name} · ${roleName[me.role]}` : undefined}
        className={`flex h-12 items-center gap-2.5 rounded-xl text-left hover:bg-on-surface/5 ${rail ? 'w-12 justify-center' : 'w-full px-2'}`}
      >
        <Initial name={me.display_name} id={me.id} size={30} member />
        {!rail && (
          <>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-label-medium">{me.display_name}</span>
              <span className="block text-label-small font-normal text-on-surface-variant">{roleName[me.role]}</span>
            </span>
            <IconUnfold width={16} height={16} className="text-on-surface-variant" />
          </>
        )}
      </button>
      {open && (
        <div style={at} className="fixed z-30 w-[220px] origin-bottom-left animate-pop rounded-3xl border border-hairline bg-surface-container-lowest p-1.5 shadow-float">
          <ThemeRow />
          <button
            onClick={signOut}
            className="mt-1 flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-label-medium text-on-surface-variant hover:bg-surface-container-low"
          >
            <IconLogout width={18} height={18} />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}

function ThemeRow() {
  return (
    <div className="px-1 pt-1">
      <ThemeSwitch />
    </div>
  )
}
