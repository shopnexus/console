import { type ReactNode, useState } from 'react'
import { Link } from 'react-router'
import IconSpark from '~icons/material-symbols/auto-awesome-outline-rounded'
import IconCalendar from '~icons/material-symbols-light/calendar-month-outline-rounded'
import IconChevron from '~icons/material-symbols-light/chevron-right-rounded'
import IconForum from '~icons/material-symbols-light/forum-outline-rounded'
import IconKey from '~icons/material-symbols-light/key-outline-rounded'
import IconMembers from '~icons/material-symbols-light/group-outline-rounded'
import IconOverview from '~icons/material-symbols-light/space-dashboard-outline-rounded'
import IconPay from '~icons/material-symbols-light/payments-outline-rounded'
import { SettingsShell } from '../../components/SettingsShell'
import { Card, CardHead, IconTile, Initial, Meter, Notice, Tag } from '../../components/ui'
import { fillAt } from '../../lib/aiLook'
import { int, time, usd } from '../../lib/format'
import { useMembersToSee } from '../../lib/members'
import { type Spend, useAgents, useMembers, useSpend } from '../../lib/settings'

/** Settings › Overview: the month's spend, questions and who uses the agents, the daily spend by agent, and members who need an admin. */
export function Overview() {
  const spend = useSpend('month')
  const agents = useAgents()
  const members = useMembers()
  const toSee = useMembersToSee(true)
  const s = spend.data
  const alist = agents.data?.items ?? []
  const consoleIds = alist.filter((a) => a.kind === 'console').map((a) => a.id)
  const questions = s?.by_agent.filter((x) => consoleIds.includes(x.agent_id)).reduce((n, x) => n + x.requests, 0)
  const memberCount = members.data?.items.filter((m) => m.status === 'active').length
  const [{ daysLeft, month }] = useState(() => {
    const now = new Date()
    return { daysLeft: new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate(), month: now.toLocaleDateString('en-US', { month: 'long' }) }
  })
  const top = Math.max(1, ...(s?.by_member.map((m) => m.usd) ?? [1]))

  return (
    <SettingsShell
      title="Overview"
      icon={<IconOverview />}
      chips={[
        [<IconCalendar key="c" width={16} height={16} />, `${month} · ${daysLeft} days left`],
        ...(memberCount !== undefined ? ([[<IconMembers key="m" width={16} height={16} />, `${memberCount} members`]] as [ReactNode, ReactNode][]) : []),
        [<IconSpark key="a" width={16} height={16} />, `${alist.length} agents`],
      ]}
    >
      {spend.error && <Notice>Spend did not load.</Notice>}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-2.5">
            <IconTile>
              <IconPay width={18} height={18} />
            </IconTile>
            <span className="text-body-small text-on-surface-variant">{month} spend</span>
          </div>
          <p className="mt-3 text-headline-large tabular-nums">{s ? usd(s.total_usd) : '–'}</p>
          {s && (
            <div className="mt-2 flex items-center gap-2 text-body-small text-on-surface-variant">
              <Meter pct={(s.total_usd / s.cap_usd) * 100} className="h-1.5 flex-1" />
              <span className="tabular-nums">
                {Math.round((s.total_usd / s.cap_usd) * 100)}% of ${s.cap_usd}
              </span>
            </div>
          )}
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2.5">
            <IconTile tone="bg-secondary-container text-on-secondary-container">
              <IconForum width={18} height={18} />
            </IconTile>
            <span className="text-body-small text-on-surface-variant">Agent questions</span>
          </div>
          <p className="mt-3 text-headline-large tabular-nums">{questions !== undefined ? int(questions) : '–'}</p>
          <p className="mt-2 text-body-small text-on-surface-variant">to console agents this month</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2.5">
            <IconTile tone="bg-inverse-primary/40 text-primary-container">
              <IconMembers width={18} height={18} />
            </IconTile>
            <span className="text-body-small text-on-surface-variant">Members using agents</span>
          </div>
          <p className="mt-3 text-headline-large tabular-nums">
            {s ? s.by_member.length : '–'}
            {memberCount !== undefined && `/${memberCount}`}
          </p>
          <div className="mt-2 flex items-center gap-2 text-body-small text-on-surface-variant">
            <span className="flex -space-x-1.5">
              {s?.by_member.slice(0, 5).map((m) => (
                <span key={m.member_id} className="rounded-full ring-2 ring-surface-container-lowest">
                  <Initial name={m.display_name} id={m.member_id} size={22} member />
                </span>
              ))}
            </span>
            {memberCount !== undefined && s && memberCount > s.by_member.length && `+${memberCount - s.by_member.length} haven't asked`}
          </div>
        </Card>
      </div>
      {s && (
        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
          <Card>
            <CardHead
              title="Daily spend"
              right={
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-label-small font-normal text-on-surface-variant">
                  {agentsIn(s).map((id) => {
                    const i = alist.findIndex((a) => a.id === id)
                    return (
                      <span key={id} className="flex items-center gap-1.5">
                        <span className={`h-2.5 w-2.5 rounded-[3px] ${fillAt(i)}`} />
                        {alist[i]?.name ?? id}
                      </span>
                    )
                  })}
                </div>
              }
            />
            <StackedDays s={s} order={alist.map((a) => a.id)} />
          </Card>
          <Card className="p-5 pb-3">
            <CardHead title="Needs a look" right={toSee.data?.length ? <Tag tone="bg-error-container text-error">{toSee.data.length}</Tag> : undefined} />
            {toSee.data?.map((m) => (
              <Link key={m.id} to="/settings/members" className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2 text-body-medium hover:bg-on-surface/5">
                <IconTile size={32} round tone="bg-tertiary-fixed text-on-tertiary-fixed-variant">
                  <IconKey width={17} height={17} />
                </IconTile>
                <span className="min-w-0 flex-1">
                  {m.display_name}
                  <span className="block text-body-small text-on-surface-variant">
                    {m.locked_until ? `Sign-in locked until ${time(m.locked_until)}` : 'Two-step sign-in not set up'}
                  </span>
                </span>
                <IconChevron width={18} height={18} className="text-on-surface-variant" />
              </Link>
            ))}
            {toSee.data?.length === 0 && <p className="py-2 text-body-medium text-on-surface-variant">Nothing to look at.</p>}
          </Card>
          <Card className="p-5 pb-3">
            <CardHead title="By member" />
            {s.by_member.map((m) => (
              <div key={m.member_id} className="flex items-center gap-3 py-1.5">
                <Initial name={m.display_name} id={m.member_id} size={30} member />
                <span className="w-[130px] truncate text-body-medium">{m.display_name}</span>
                <Meter pct={(m.usd / top) * 100} tone="bg-primary/70" className="h-1.5 flex-1" />
                <span className="w-28 whitespace-nowrap text-right tabular-nums text-body-small text-on-surface-variant">{int(m.requests)} questions</span>
                <span className="w-16 text-right text-label-medium tabular-nums">{usd(m.usd)}</span>
              </div>
            ))}
          </Card>
        </div>
      )}
    </SettingsShell>
  )
}

/** The agents with any spend in the range, in the order of the agents list. */
function agentsIn(s: Spend): string[] {
  const seen = new Set<string>()
  for (const d of s.days) for (const id of Object.keys(d.by_agent)) seen.add(id)
  return [...seen]
}

/** A bar per day, split by agent in each agent's colour; today's bar is faint. */
function StackedDays({ s, order }: { s: Spend; order: string[] }) {
  const h = 170
  const totals = s.days.map((d) => Object.values(d.by_agent).reduce((a, b) => a + b, 0))
  const top = Math.max(1, ...totals)
  const ids = agentsIn(s).sort((a, b) => order.indexOf(a) - order.indexOf(b))
  return (
    <div>
      <div className="relative pr-8" style={{ height: h }}>
        {[50, 100].map((p) => (
          <div key={p} className="absolute inset-x-0 border-t border-dashed border-hairline" style={{ bottom: `${p}%` }}>
            <span className="absolute -top-2.5 right-0 bg-surface-container-lowest pl-1 tabular-nums text-label-small font-normal text-on-surface-variant">
              ${Math.round((top * p) / 100)}
            </span>
          </div>
        ))}
        <div className="relative flex h-full items-end gap-1.5">
          {s.days.map((d, i) => (
            <div key={d.date} title={`${d.date} · ${usd(totals[i])}`} className={`flex flex-1 flex-col-reverse ${i === s.days.length - 1 ? 'opacity-50' : ''}`}>
              {ids.map((id) => (
                <span
                  key={id}
                  className={`block w-full last:rounded-t-[5px] ${fillAt(order.indexOf(id))}`}
                  style={{ height: ((d.by_agent[id] ?? 0) / top) * h }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex justify-between pr-8 text-label-small font-normal text-on-surface-variant">
        <span>{s.days[0]?.date.slice(5).replace('-', '/')}</span>
        <span>Today</span>
      </div>
    </div>
  )
}
