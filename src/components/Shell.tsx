import { type ReactNode, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router'
import IconCollapse from '~icons/material-symbols/left-panel-close-outline-rounded'
import IconExpand from '~icons/material-symbols/left-panel-open-outline-rounded'
import IconOpen from '~icons/material-symbols/open-in-new-rounded'
import IconLock from '~icons/material-symbols/lock-outline-rounded'
import IconLogout from '~icons/material-symbols/logout-rounded'
import { post, roleName } from '../lib/api'
import { useMembersToSee } from '../lib/members'
import { useOpenCount } from '../lib/support'
import { dashboards, mayOpen } from '../lib/dashboards'
import { navigation, useNavCollapsed } from '../lib/navigation'
import { useForgetMe, useMe } from '../lib/session'
import { ThemeSwitch } from './ui'

/**
 * The console's shell: the navigation drawer and the top bar. The drawer
 * collapses to a 64 px rail with the button beside the name or with "[".
 * railFirst starts it collapsed on a page that has panes of its own.
 */
export function Shell({ title, railFirst = false, children }: { title: string; railFirst?: boolean; children: ReactNode }) {
  const me = useMe()
  const admin = me.role === 'admin'
  const toSee = useMembersToSee(admin)
  const openTickets = useOpenCount()
  const navigate = useNavigate()
  const forget = useForgetMe()
  const [rail, toggle] = useNavCollapsed(railFirst)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== '[' || (e.target as HTMLElement).closest('input, textarea, [contenteditable]')) return
      toggle()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle])

  async function signOut() {
    await post('/console/logout').catch(() => undefined)
    forget()
    navigate('/signin', { replace: true })
  }

  // One row shape for every entry: a 40 px pill with the label, or a 40 px
  // square with the label as its title on the rail.
  const row = `flex h-10 items-center gap-2.5 rounded-full ${rail ? 'w-10 justify-center' : 'px-3'}`
  const label = (text: string) => (rail ? null : <span className="flex-1 truncate text-label-large">{text}</span>)

  return (
    <div className="flex h-dvh bg-surface text-on-surface">
      <nav
        className={`flex shrink-0 flex-col overflow-y-auto overflow-x-hidden bg-surface-container-low py-3 transition-[width] duration-(--duration-spatial-default) ease-spatial ${
          rail ? 'w-16 items-center px-3' : 'w-64 px-3'
        }`}
      >
        <div className={`flex items-center pb-3 ${rail ? 'flex-col gap-2' : 'gap-2 pl-2'}`}>
          <NavLink to="/" className="flex min-w-0 flex-1 items-center gap-2.5">
            <img src="/favicon.svg" alt="ShopNexus" className="h-8 w-8 shrink-0 rounded-md" />
            {!rail && (
              <>
                <span className="text-title-small">ShopNexus</span>
                <span className="rounded-full bg-secondary-container px-2 text-label-small text-on-secondary-container">Console</span>
              </>
            )}
          </NavLink>
          <button
            title={rail ? 'Mở rộng ([)' : 'Thu gọn ([)'}
            aria-label={rail ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
            onClick={toggle}
            className="state-layer flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-surface-variant"
          >
            {rail ? <IconExpand width={20} height={20} /> : <IconCollapse width={20} height={20} />}
          </button>
        </div>
        <div className="space-y-0.5">
          {navigation
            .filter((n) => admin || !n.adminOnly)
            .map((n) => {
              const count =
                n.to === '/support' ? openTickets.data?.open || 0 : n.to === '/members' ? (toSee.data?.length ?? 0) : 0
              const urgent = n.to === '/members'
              if (n.soon) {
                return (
                  <span key={n.to} title={rail ? `${n.label} · Sắp có` : undefined} className={`${row} text-on-surface-variant opacity-60`}>
                    {n.icon}
                    {label(n.label)}
                    {!rail && <span className="shrink-0 rounded-full border border-outline-variant px-1.5 text-label-small">Sắp có</span>}
                  </span>
                )
              }
              return (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.to !== '/support'}
                  title={rail ? n.label : undefined}
                  className={({ isActive }) =>
                    `state-layer relative ${row} ${isActive ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant'}`
                  }
                >
                  {n.icon}
                  {label(n.label)}
                  {count > 0 &&
                    (rail ? (
                      <span
                        className={`absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-label-small ${
                          urgent ? 'bg-error text-on-error' : 'bg-primary text-on-primary'
                        }`}
                      >
                        {count}
                      </span>
                    ) : urgent ? (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-error px-1.5 text-label-small text-on-error">
                        {count}
                      </span>
                    ) : (
                      <span className="text-label-large">{count}</span>
                    ))}
                </NavLink>
              )
            })}
        </div>
        {rail ? (
          <span className="my-3 h-px w-6 shrink-0 bg-outline-variant" />
        ) : (
          <p className="mt-4 px-3 pb-1 text-label-medium text-on-surface-variant">Công cụ</p>
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
                className={`state-layer ${row} text-on-surface-variant`}
              >
                {d.icon}
                {label(d.name)}
                {!rail && <IconOpen width={16} height={16} className="text-outline" />}
              </a>
            ) : (
              <span
                key={d.app}
                title={rail ? `${d.name} · Cần quyền ${roleName.admin}` : `Cần quyền ${roleName.admin}`}
                className={`${row} text-on-surface-variant opacity-60`}
              >
                {d.icon}
                {label(d.name)}
                {!rail && <IconLock width={16} height={16} className="text-outline" />}
              </span>
            ),
          )}
        </div>
        <div className={`mt-auto flex items-center pt-3 ${rail ? 'flex-col gap-1' : 'gap-2 rounded-lg bg-surface-container py-1.5 pl-1.5 pr-1'}`}>
          <span
            title={rail ? `${me.display_name} · ${roleName[me.role]}` : undefined}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-title-small uppercase text-on-primary"
          >
            {me.display_name.trim()[0]}
          </span>
          {!rail && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-label-large">{me.display_name}</p>
              <p className="text-body-small text-on-surface-variant">{roleName[me.role]}</p>
            </div>
          )}
          <button
            title="Đăng xuất"
            onClick={signOut}
            className="state-layer flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-surface-variant"
          >
            <IconLogout width={20} height={20} />
          </button>
        </div>
      </nav>
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <header className="flex h-12 shrink-0 items-center gap-4 px-5">
          <h1 className="flex-1 text-title-large">{title}</h1>
          <ThemeSwitch />
        </header>
        <main className="flex min-h-0 flex-1 flex-col px-5 pb-5">{children}</main>
      </div>
    </div>
  )
}
