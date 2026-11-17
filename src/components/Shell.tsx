import { type ReactNode, useCallback, useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router'
import IconCollapse from '~icons/material-symbols-light/left-panel-close-outline-rounded'
import IconExpand from '~icons/material-symbols-light/left-panel-open-outline-rounded'
import IconLock from '~icons/material-symbols-light/lock-outline'
import IconLogout from '~icons/material-symbols-light/logout-rounded'
import IconOpen from '~icons/material-symbols-light/north-east-rounded'
import IconSearch from '~icons/material-symbols-light/search-rounded'
import IconUnfold from '~icons/material-symbols-light/unfold-more-rounded'
import { post, roleName } from '../lib/api'
import { rememberAccount } from '../lib/accounts'
import { dashboards, mayOpen } from '../lib/dashboards'
import { navigation, useNavCollapsed } from '../lib/navigation'
import { useForgetMe, useMe } from '../lib/session'
import { useCases } from '../lib/reports'
import { useOpenCount } from '../lib/support'
import { AccountSearch } from './AccountSearch'
import { typing, useAnchor, useDismiss } from '../lib/dom'
import { Initial, Kbd, ThemeSwitch } from './ui'

/**
 * The console's shell: a 232 px nav on the page colour and the work area as
 * one white card. The nav collapses to a 64 px rail with the button beside
 * the name or with "["; railFirst starts it collapsed on a page with panes
 * of its own. A title puts a 52 px header in the card; without one the page
 * fills the card itself. flush drops the card's padding for pages of panes.
 */
export function Shell({
  title,
  actions,
  flush = false,
  railFirst = false,
  children,
}: {
  title?: string
  actions?: ReactNode
  flush?: boolean
  railFirst?: boolean
  children: ReactNode
}) {
  const me = useMe()
  const openTickets = useOpenCount()
  const openCases = useCases('open')
  const [rail, toggle] = useNavCollapsed(railFirst)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== '[' || typing(e)) return
      toggle()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle])

  // One row shape for every entry: 32 px with the label, or a 32 px square
  // with the label as its title on the rail.
  const row = `flex h-8 items-center gap-2.5 rounded-sm text-label-large ${rail ? 'w-8 justify-center' : 'px-2'}`
  const label = (text: string) => (rail ? null : <span className="min-w-0 flex-1 truncate">{text}</span>)

  return (
    <div className="flex h-dvh bg-surface-container text-on-surface">
      <nav
        className={`flex shrink-0 flex-col overflow-y-auto overflow-x-hidden p-3 transition-[width] duration-(--duration-spatial-default) ease-spatial ${
          rail ? 'w-16 items-center' : 'w-[232px]'
        }`}
      >
        <div className={`flex items-center ${rail ? 'flex-col gap-2' : 'h-9 gap-2 pl-2'}`}>
          <NavLink to="/" className="flex min-w-0 flex-1 items-center gap-2">
            <img src="/favicon.svg" alt="ShopNexus" className="h-6 w-6 shrink-0 rounded-sm" />
            {!rail && (
              <>
                <span className="text-title-medium">ShopNexus</span>
                <span className="text-body-medium text-on-surface-variant">Console</span>
              </>
            )}
          </NavLink>
          <button
            title={rail ? 'Mở rộng ([)' : 'Thu gọn ([)'}
            aria-label={rail ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
            onClick={toggle}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-on-surface-variant hover:bg-surface-container-low"
          >
            {rail ? <IconExpand width={18} height={18} /> : <IconCollapse width={18} height={18} />}
          </button>
        </div>
        <NavSearch rail={rail} />
        <div className="mt-4 space-y-0.5">
          {navigation.map((n) => {
            if (n.soon) {
              return (
                <span key={n.to} title={`${n.label} · Sắp có`} className={`${row} text-outline`}>
                  {n.icon}
                  {label(n.label)}
                  {!rail && <span className="text-label-small">Sắp có</span>}
                </span>
              )
            }
            const count = n.to === '/support' ? openTickets.data?.open || 0 : n.to === '/reports' ? openCases.total || 0 : 0
            return (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === '/'}
                title={rail ? n.label : undefined}
                className={({ isActive }) =>
                  `relative ${row} ${
                    isActive
                      ? 'bg-surface-container-lowest text-on-surface shadow-lift [&>svg]:text-primary'
                      : 'text-on-surface-variant hover:bg-surface-container-low'
                  }`
                }
              >
                {n.icon}
                {label(n.label)}
                {count > 0 &&
                  (rail ? (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-label-small tabular-nums text-on-primary">
                      {count}
                    </span>
                  ) : (
                    <span className="text-body-small tabular-nums text-on-surface-variant">{count}</span>
                  ))}
              </NavLink>
            )
          })}
        </div>
        {rail ? (
          <span className="my-3 h-px w-6 shrink-0 bg-hairline" />
        ) : (
          <p className="mb-1 mt-6 px-2 text-label-medium text-on-surface-variant">Công cụ</p>
        )}
        <div className="space-y-0.5">
          {dashboards.map((d) =>
            mayOpen(me.role, d) ? (
              <a
                key={d.app}
                href={`/dashboards/open?app=${d.app}`}
                target="_blank"
                rel="noreferrer"
                title={rail ? d.name : undefined}
                className={`${row} font-normal text-on-surface-variant hover:bg-surface-container-low`}
              >
                {d.icon}
                {label(d.name)}
                {!rail && <IconOpen width={14} height={14} className="text-outline" />}
              </a>
            ) : (
              <span
                key={d.app}
                title={rail ? `${d.name} · Cần quyền ${roleName.admin}` : `Cần quyền ${roleName.admin}`}
                className={`${row} font-normal text-outline`}
              >
                {d.icon}
                {label(d.name)}
                {!rail && <IconLock width={14} height={14} />}
              </span>
            ),
          )}
        </div>
        <span className="flex-1" />
        <MemberMenu rail={rail} />
      </nav>
      <div className="my-2 mr-2 flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl bg-surface-container-lowest shadow-lift">
        {title && (
          <header className="flex h-[52px] shrink-0 items-center gap-3 border-b border-hairline px-5">
            <h1 className="min-w-0 flex-1 truncate text-title-medium">{title}</h1>
            {actions}
          </header>
        )}
        <main className={`flex min-h-0 flex-1 ${flush ? '' : 'flex-col overflow-y-auto p-5'}`}>{children}</main>
      </div>
    </div>
  )
}

/**
 * "Tìm tài khoản" with "/": the account search in a popover, and a pick
 * opens the account. On Tài khoản, whose list has its own search, "/" and
 * the button focus that search instead.
 */
function NavSearch({ rail }: { rail: boolean }) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const ref = useDismiss<HTMLDivElement>(open, close)
  const at = useAnchor(ref, open, 'below')
  const navigate = useNavigate()
  const onAccounts = useLocation().pathname.startsWith('/accounts')
  const start = useCallback(() => {
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
    <div ref={ref} className="relative mt-3">
      <button
        onClick={start}
        title={rail ? 'Tìm tài khoản (/)' : undefined}
        className={`flex h-8 items-center gap-2 rounded-sm border border-hairline bg-surface-container-lowest text-body-medium text-on-surface-variant ${
          rail ? 'w-8 justify-center' : 'w-full px-2'
        }`}
      >
        <IconSearch width={16} height={16} />
        {!rail && (
          <>
            <span className="flex-1 text-left">Tìm tài khoản</span>
            {!onAccounts && <Kbd>/</Kbd>}
          </>
        )}
      </button>
      {open && (
        <div style={at} className="fixed z-30 w-[340px] rounded-xl bg-surface-container-lowest p-1.5 shadow-float">
          <AccountSearch
            onPick={(a) => {
              rememberAccount(a)
              close()
              navigate(`/accounts/${a.id}`)
            }}
          />
        </div>
      )}
    </div>
  )
}

/** The member at the bottom of the nav, with the theme and sign-out in a menu. */
function MemberMenu({ rail }: { rail: boolean }) {
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
    <div ref={ref} className="relative mt-3">
      <button
        onClick={() => setOpen((o) => !o)}
        title={rail ? `${me.display_name} · ${roleName[me.role]}` : undefined}
        className={`flex h-10 items-center gap-2.5 rounded-sm text-left hover:bg-surface-container-low ${rail ? 'w-10 justify-center' : 'w-full px-2'}`}
      >
        <Initial name={me.display_name} id={me.id} size={24} member />
        {!rail && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-label-large">{me.display_name}</span>
              <span className="block text-label-small font-normal text-on-surface-variant">{roleName[me.role]}</span>
            </span>
            <IconUnfold width={16} height={16} className="text-on-surface-variant" />
          </>
        )}
      </button>
      {open && (
        <div style={at} className="fixed z-30 w-[208px] rounded-xl bg-surface-container-lowest p-1.5 shadow-float">
          <ThemeSwitch />
          <button
            onClick={signOut}
            className="mt-1 flex h-8 w-full items-center gap-2 rounded-sm px-2 text-label-large text-on-surface-variant hover:bg-surface-container-low"
          >
            <IconLogout width={18} height={18} />
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  )
}
