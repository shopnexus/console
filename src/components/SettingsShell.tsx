import type { ReactNode } from 'react'
import { Navigate, NavLink } from 'react-router'
import IconSpark from '~icons/material-symbols/auto-awesome-outline-rounded'
import IconBack from '~icons/material-symbols-light/arrow-back-rounded'
import IconBudget from '~icons/material-symbols-light/speed-outline-rounded'
import IconCloud from '~icons/material-symbols-light/cloud-outline'
import IconGuard from '~icons/material-symbols-light/verified-user-outline-rounded'
import IconHistory from '~icons/material-symbols-light/history-rounded'
import IconMembers from '~icons/material-symbols-light/group-outline-rounded'
import IconModels from '~icons/material-symbols-light/neurology-outline-rounded'
import IconOverview from '~icons/material-symbols-light/space-dashboard-outline-rounded'
import IconTools from '~icons/material-symbols-light/build-outline-rounded'
import { useMe } from '../lib/session'
import { MemberMenu } from './Shell'

const groups: [string, [string, string, ReactNode][]][] = [
  ['', [['/settings', 'Overview', <IconOverview key="o" width={19} height={19} />]]],
  ['People and access', [['/settings/members', 'Members', <IconMembers key="m" width={19} height={19} />]]],
  [
    'AI',
    [
      ['/settings/agents', 'Agents', <IconSpark key="a" width={19} height={19} />],
      ['/settings/models', 'Models', <IconModels key="mo" width={19} height={19} />],
      ['/settings/providers', 'Providers', <IconCloud key="p" width={19} height={19} />],
      ['/settings/budgets', 'Budgets', <IconBudget key="b" width={19} height={19} />],
      ['/settings/tools', 'Tools', <IconTools key="t" width={19} height={19} />],
    ],
  ],
  [
    'Oversight',
    [
      ['/settings/guardrails', 'Guardrails', <IconGuard key="g" width={19} height={19} />],
      ['/settings/audit', 'Audit log', <IconHistory key="h" width={19} height={19} />],
    ],
  ],
]

/**
 * Settings, for admins: its own sidebar with "Console" to go back, and each
 * page on a hero band with the page's icon, its title, a row of facts and
 * its actions. Anyone else goes back to the console.
 */
export function SettingsShell({
  title,
  icon,
  chips,
  actions,
  art = false,
  children,
}: {
  title: ReactNode
  icon: ReactNode
  chips?: [ReactNode, ReactNode][]
  actions?: ReactNode
  art?: boolean
  children: ReactNode
}) {
  const me = useMe()
  if (me.role !== 'admin') return <Navigate to="/" replace />
  return (
    <div className="flex h-dvh bg-surface-container-lowest text-on-surface">
      <nav className="flex w-[272px] shrink-0 flex-col border-r border-hairline bg-surface px-3 pb-3 pt-3">
        <div className="flex h-10 items-center gap-2 px-1.5">
          <img src="/favicon.svg" alt="ShopNexus" className="h-7 w-7 rounded-md" />
          <span className="text-title-small">Settings</span>
        </div>
        <NavLink to="/" viewTransition className="mt-3 flex h-9 items-center gap-3 rounded-lg px-2.5 text-label-medium text-on-surface-variant hover:bg-on-surface/5">
          <IconBack width={19} height={19} />
          Console
        </NavLink>
        <span className="my-2 h-px bg-outline-variant/40" />
        <div className="min-h-0 flex-1 overflow-y-auto">
          {groups.map(([head, items]) => (
            <div key={head}>
              {head && <p className="px-2.5 pb-1 pt-4 text-label-small font-normal text-on-surface-variant/80">{head}</p>}
              {items.map(([to, label, ic]) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/settings'}
                  viewTransition
                  className={({ isActive }) =>
                    `relative isolate flex h-9 items-center gap-3 rounded-lg px-2.5 text-label-medium ${
                      isActive ? 'font-medium text-on-surface [&>svg]:text-primary' : 'text-on-surface-variant hover:bg-on-surface/5'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <span aria-hidden className="vt-pill absolute inset-0 -z-10 rounded-lg bg-on-surface/6" />}
                      {ic}
                      {label}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </div>
        <MemberMenu rail={false} />
      </nav>
      <main className="vt-work flex min-w-0 flex-1 flex-col overflow-hidden">
        <section className="band relative shrink-0 overflow-hidden border-b border-hairline px-10 pb-6 pt-8">
          <div aria-hidden className="dots pointer-events-none absolute inset-0" />
          <div className="relative flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-surface-container-lowest text-primary shadow-soft [&>svg]:h-7 [&>svg]:w-7">
              {icon}
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="text-headline-large">{title}</h1>
              {chips && chips.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {chips.map(([ic, text], i) => (
                    <span
                      key={i}
                      className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full border border-hairline bg-surface-container-lowest/80 px-3 text-body-small text-on-surface-variant backdrop-blur [&>svg]:text-primary"
                    >
                      {ic}
                      {text}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">{actions}</div>
            {art && <img src="/art-ai-reading.webp" alt="" className="-my-4 h-[104px] w-[104px] object-contain" />}
          </div>
        </section>
        <div className="min-h-0 flex-1 animate-rise overflow-y-auto bg-surface-container-low/40 px-10 py-6">{children}</div>
      </main>
    </div>
  )
}
