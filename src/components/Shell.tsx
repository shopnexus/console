import type { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router'
import IconOpen from '~icons/material-symbols/open-in-new-rounded'
import IconLock from '~icons/material-symbols/lock-outline-rounded'
import IconLogout from '~icons/material-symbols/logout-rounded'
import { post, roleName } from '../lib/api'
import { useMembersToSee } from '../lib/members'
import { dashboards, mayOpen } from '../lib/dashboards'
import { navigation } from '../lib/navigation'
import { useForgetMe, useMe } from '../lib/session'
import { ThemeSwitch } from './ui'

/** The console's shell: the navigation drawer and the top bar. */
export function Shell({ title, children }: { title: string; children: ReactNode }) {
  const me = useMe()
  const admin = me.role === 'admin'
  const toSee = useMembersToSee(admin)
  const navigate = useNavigate()
  const forget = useForgetMe()

  async function signOut() {
    await post('/staff/logout').catch(() => undefined)
    forget()
    navigate('/signin', { replace: true })
  }

  return (
    <div className="flex h-dvh bg-surface text-on-surface">
      <nav className="flex w-[360px] shrink-0 flex-col overflow-y-auto bg-surface-container-low px-3 py-4">
        <NavLink to="/" className="flex items-center gap-3 px-4 pb-6 pt-1">
          <img src="/favicon.svg" alt="ShopNexus" className="h-9 w-9 rounded-md" />
          <span className="text-title-medium">ShopNexus</span>
          <span className="rounded-full bg-secondary-container px-2.5 py-0.5 text-label-medium text-on-secondary-container">Console</span>
        </NavLink>
        <div className="space-y-1">
          {navigation
            .filter((n) => admin || !n.adminOnly)
            .map((n) =>
              n.soon ? (
                <span key={n.to} className="flex h-14 items-center gap-3 rounded-full px-4 text-on-surface-variant opacity-60">
                  {n.icon}
                  <span className="flex-1 text-label-large">{n.label}</span>
                  <span className="rounded-full border border-outline-variant px-2 py-0.5 text-label-small">Sắp có</span>
                </span>
              ) : (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end
                  className={({ isActive }) =>
                    `state-layer flex h-14 items-center gap-3 rounded-full px-4 ${
                      isActive ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant'
                    }`
                  }
                >
                  {n.icon}
                  <span className="flex-1 text-label-large">{n.label}</span>
                  {n.to === '/members' && toSee.data && toSee.data.length > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-error px-1.5 text-label-small text-on-error">
                      {toSee.data.length}
                    </span>
                  )}
                </NavLink>
              ),
            )}
        </div>
        <p className="mt-6 px-4 pb-2 text-title-small text-on-surface-variant">Công cụ</p>
        {dashboards.map((d) =>
          mayOpen(me.role, d) ? (
            <a
              key={d.app}
              href={`/dashboards/open?app=${d.app}`}
              target="_blank"
              rel="noreferrer"
              className="state-layer flex h-11 items-center gap-3 rounded-full px-4 text-on-surface-variant"
            >
              {d.icon}
              <span className="flex-1 text-label-large">{d.name}</span>
              <IconOpen width={16} height={16} className="text-outline" />
            </a>
          ) : (
            <span
              key={d.app}
              title={`Cần quyền ${roleName.admin}`}
              className="flex h-11 items-center gap-3 rounded-full px-4 text-on-surface-variant opacity-60"
            >
              {d.icon}
              <span className="flex-1 text-label-large">{d.name}</span>
              <IconLock width={16} height={16} className="text-outline" />
            </span>
          ),
        )}
        <div className="mt-auto flex items-center gap-3 rounded-xl bg-surface-container px-3 py-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-title-medium uppercase text-on-primary">
            {me.display_name.trim()[0]}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-label-large">{me.display_name}</p>
            <p className="text-body-small text-on-surface-variant">{roleName[me.role]}</p>
          </div>
          <button
            title="Đăng xuất"
            onClick={signOut}
            className="state-layer flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant"
          >
            <IconLogout width={20} height={20} />
          </button>
        </div>
      </nav>
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <header className="flex h-16 shrink-0 items-center gap-4 px-8">
          <h1 className="flex-1 text-title-large">{title}</h1>
          <ThemeSwitch />
        </header>
        <main className="flex-1 px-8 pb-8">{children}</main>
      </div>
    </div>
  )
}
