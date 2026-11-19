import { useState } from 'react'
import { Link } from 'react-router'
import IconSpark from '~icons/material-symbols/auto-awesome-outline-rounded'
import IconChevron from '~icons/material-symbols-light/chevron-right-rounded'
import IconForum from '~icons/material-symbols-light/forum-outline-rounded'
import IconKey from '~icons/material-symbols-light/key-outline-rounded'
import IconMembers from '~icons/material-symbols-light/group-outline-rounded'
import IconOverview from '~icons/material-symbols-light/space-dashboard-outline-rounded'
import IconPay from '~icons/material-symbols-light/payments-outline-rounded'
import { RangePicker, SettingsShell } from '../../components/SettingsShell'
import { Card, CardHead, IconTile, Initial, Meter, Notice, Tag } from '../../components/ui'
import { int, time, usd } from '../../lib/format'
import { useMembersToSee } from '../../lib/members'
import { budgetUse, rangeLabel, settingsFailure, type SpendRange, useAgents, useAgentUsage, useBudgets, useMembers, useSpend } from '../../lib/settings'
import { SpendBars } from './SpendBars'

/** Settings › Overview: spend over a range, the agents and their budgets, the providers, and members who need an admin. */
export function Overview() {
  const [range, setRange] = useState<SpendRange>('30d')
  const spend = useSpend(range)
  const agents = useAgents()
  const budgets = useBudgets()
  const usage = useAgentUsage(range)
  const members = useMembers()
  const toSee = useMembersToSee(true)
  const s = spend.data
  const alist = agents.data?.items ?? []
  const memberCount = members.data?.items.filter((m) => m.status === 'active').length
  const consoleIds = alist.filter((a) => a.kind === 'console').map((a) => a.id)
  const questions = usage.data?.items.filter((u) => consoleIds.includes(u.agent_id)).reduce((n, u) => n + u.requests, 0)
  const byMember = s?.members ?? []
  const topMember = Math.max(1, ...byMember.map((m) => m.usd))
  const near = budgets.data?.agents.filter((b) => budgetUse(b.spent_usd, b.monthly_budget_usd).near) ?? []

  return (
    <SettingsShell
      title="Overview"
      icon={<IconOverview />}
      chips={[
        memberCount !== undefined && [<IconMembers key="m" width={16} height={16} />, `${memberCount} members`],
        [<IconSpark key="a" width={16} height={16} />, `${alist.length} agents`],
      ]}
    >
      {spend.error && <Notice>{settingsFailure(spend.error)}</Notice>}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2.5">
            <IconTile>
              <IconPay width={18} height={18} />
            </IconTile>
            <span className="text-body-small text-on-surface-variant">Spend · {rangeLabel[range]}</span>
          </div>
          <p className="mt-3 text-headline-large tabular-nums">{s ? usd(s.total_usd) : '–'}</p>
          <p className="mt-2 text-body-small text-on-surface-variant">{s ? `${usd(s.total_usd / Math.max(1, s.days.length))} a day` : ''}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2.5">
            <IconTile tone="bg-secondary-container text-on-secondary-container">
              <IconSpark width={18} height={18} />
            </IconTile>
            <span className="text-body-small text-on-surface-variant">Agents on</span>
          </div>
          <p className="mt-3 text-headline-large tabular-nums">
            {alist.filter((a) => a.enabled).length}/{alist.length}
          </p>
          <p className="mt-2 text-body-small text-on-surface-variant">{near.length ? `${near.length} near their budget` : 'None near its budget'}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2.5">
            <IconTile tone="bg-primary/8 text-primary">
              <IconForum width={18} height={18} />
            </IconTile>
            <span className="text-body-small text-on-surface-variant">Agent questions</span>
          </div>
          <p className="mt-3 text-headline-large tabular-nums">{questions !== undefined ? int(questions) : '–'}</p>
          <p className="mt-2 text-body-small text-on-surface-variant">to console agents</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2.5">
            <IconTile tone="bg-inverse-primary/40 text-primary-container">
              <IconMembers width={18} height={18} />
            </IconTile>
            <span className="text-body-small text-on-surface-variant">Members using agents</span>
          </div>
          <p className="mt-3 text-headline-large tabular-nums">
            {s?.members ? byMember.length : '–'}
            {memberCount !== undefined && s?.members ? `/${memberCount}` : ''}
          </p>
          <div className="mt-2 flex items-center gap-2 text-body-small text-on-surface-variant">
            <span className="flex -space-x-1.5">
              {byMember.slice(0, 5).map((m) => (
                <span key={m.member_id} className="rounded-full ring-2 ring-surface-container-lowest">
                  <Initial name={m.display_name} id={m.member_id} size={22} member />
                </span>
              ))}
            </span>
            {memberCount !== undefined && memberCount > byMember.length && s?.members ? `+${memberCount - byMember.length} haven't asked` : ''}
          </div>
        </Card>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHead
            title="Daily spend"
            right={
              <RangePicker value={range} onChange={setRange} />
            }
          />
          {s && <SpendBars s={s} agents={alist} />}
        </Card>
        <div className="space-y-4">
          <Card className="p-5 pb-3">
            <CardHead title="Needs a look" right={toSee.data?.length ? <Tag tone="bg-primary text-on-primary">{toSee.data.length}</Tag> : undefined} />
            {toSee.data?.map((m) => (
              <Link key={m.id} to="/settings/members" className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2 text-body-medium hover:bg-on-surface/5">
                <IconTile size={32} round tone="bg-surface-container text-on-surface-variant">
                  <IconKey width={17} height={17} />
                </IconTile>
                <span className="min-w-0 flex-1">
                  {m.display_name}
                  <span className="block text-body-small text-on-surface-variant">{m.locked_until ? `Sign-in locked until ${time(m.locked_until)}` : 'Two-step sign-in not set up'}</span>
                </span>
                <IconChevron width={18} height={18} className="text-on-surface-variant" />
              </Link>
            ))}
            {toSee.data?.length === 0 && <p className="py-2 text-body-medium text-on-surface-variant">Nothing to look at.</p>}
          </Card>
          {byMember.length > 0 && (
            <Card className="p-5 pb-3">
              <CardHead title="By member" />
              {byMember.map((m) => (
                <div key={m.member_id} className="flex items-center gap-3 py-1.5">
                  <Initial name={m.display_name} id={m.member_id} size={28} member />
                  <span className="w-[110px] min-w-0 truncate text-body-medium">{m.display_name}</span>
                  <Meter pct={(m.usd / topMember) * 100} tone="bg-primary/70" className="h-1.5 flex-1" />
                  <span className="w-20 text-right tabular-nums text-body-small text-on-surface-variant">{int(m.requests)} questions</span>
                  <span className="w-16 text-right text-label-medium tabular-nums">{usd(m.usd)}</span>
                </div>
              ))}
            </Card>
          )}
          {budgets.data && (
            <Card className="p-5 pb-3">
              <CardHead title="Budgets" right={<Link to="/settings/budgets" className="text-label-medium text-primary">Budgets</Link>} />
              {budgets.data.agents
                .filter((b) => b.monthly_budget_usd)
                .map((b) => {
                  const use = budgetUse(b.spent_usd, b.monthly_budget_usd)
                  return (
                  <div key={b.agent_id} className="py-1.5">
                    <div className="flex justify-between text-body-small">
                      <span>{b.name}</span>
                      <span className="tabular-nums text-on-surface-variant">
                        {usd(b.spent_usd)} / ${b.monthly_budget_usd}
                      </span>
                    </div>
                    <Meter pct={use.pct} tone={use.near ? 'bg-on-surface' : 'bg-primary/70'} className="mt-1 h-1.5" />
                  </div>
                  )
                })}
            </Card>
          )}
        </div>
      </div>
    </SettingsShell>
  )
}
