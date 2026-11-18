import { type ReactNode, useState } from 'react'
import { Link } from 'react-router'
import IconSpark from '~icons/material-symbols/auto-awesome-outline-rounded'
import IconChevron from '~icons/material-symbols-light/chevron-right-rounded'
import IconCloud from '~icons/material-symbols-light/cloud-outline'
import IconKey from '~icons/material-symbols-light/key-outline-rounded'
import IconMembers from '~icons/material-symbols-light/group-outline-rounded'
import IconOverview from '~icons/material-symbols-light/space-dashboard-outline-rounded'
import IconPay from '~icons/material-symbols-light/payments-outline-rounded'
import { SettingsShell } from '../../components/SettingsShell'
import { Card, CardHead, IconTile, Meter, Notice, Segmented, Tag } from '../../components/ui'
import { ApiError } from '../../lib/api'
import { time, usd } from '../../lib/format'
import { useMembersToSee } from '../../lib/members'
import { settingsFailure, type SpendRange, useAgents, useBudgets, useMembers, useProviders, useSpend } from '../../lib/settings'
import { SpendBars } from './SpendBars'

/** Settings › Overview: spend over a range, the agents and their budgets, the providers, and members who need an admin. */
export function Overview() {
  const [range, setRange] = useState<SpendRange>('30d')
  const spend = useSpend(range)
  const agents = useAgents()
  const budgets = useBudgets()
  const providers = useProviders()
  const members = useMembers()
  const toSee = useMembersToSee(true)
  const s = spend.data
  const alist = agents.data?.items ?? []
  const order = alist.map((a) => a.id)
  const memberCount = members.data?.items.filter((m) => m.status === 'active').length
  const near = budgets.data?.agents.filter((b) => b.monthly_budget_usd && b.spent_usd / b.monthly_budget_usd >= 0.8) ?? []

  return (
    <SettingsShell
      title="Overview"
      icon={<IconOverview />}
      chips={[
        ...(memberCount !== undefined ? ([[<IconMembers key="m" width={16} height={16} />, `${memberCount} members`]] as [ReactNode, ReactNode][]) : []),
        [<IconSpark key="a" width={16} height={16} />, `${alist.length} agents`],
      ]}
    >
      {spend.error && <Notice>{settingsFailure(spend.error instanceof ApiError ? spend.error.code : undefined)}</Notice>}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-2.5">
            <IconTile>
              <IconPay width={18} height={18} />
            </IconTile>
            <span className="text-body-small text-on-surface-variant">Spend · {range === '7d' ? '7' : range === '30d' ? '30' : '90'} days</span>
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
            <IconTile tone="bg-inverse-primary/40 text-primary-container">
              <IconCloud width={18} height={18} />
            </IconTile>
            <span className="text-body-small text-on-surface-variant">Providers</span>
          </div>
          <p className="mt-3 text-headline-large tabular-nums">{providers.data?.items.length ?? '–'}</p>
          <p className="mt-2 text-body-small text-on-surface-variant">
            {providers.data ? `${new Set(providers.data.items.flatMap((p) => p.models)).size} models served` : ''}
          </p>
        </Card>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHead
            title="Daily spend"
            right={
              <Segmented
                label="Range"
                value={range}
                onChange={setRange}
                items={[
                  { value: '7d', label: '7 days' },
                  { value: '30d', label: '30 days' },
                  { value: '90d', label: '90 days' },
                ]}
              />
            }
          />
          {s && <SpendBars s={s} order={order} names={Object.fromEntries(alist.map((a) => [a.id, a.name]))} />}
        </Card>
        <div className="space-y-4">
          <Card className="p-5 pb-3">
            <CardHead title="Needs a look" right={toSee.data?.length ? <Tag tone="bg-error-container text-error">{toSee.data.length}</Tag> : undefined} />
            {toSee.data?.map((m) => (
              <Link key={m.id} to="/settings/members" className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2 text-body-medium hover:bg-on-surface/5">
                <IconTile size={32} round tone="bg-tertiary-fixed text-on-tertiary-fixed-variant">
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
          {budgets.data && (
            <Card className="p-5 pb-3">
              <CardHead title="Budgets" right={<Link to="/settings/budgets" className="text-label-medium text-primary">Budgets</Link>} />
              {budgets.data.agents
                .filter((b) => b.monthly_budget_usd)
                .map((b) => (
                  <div key={b.agent_id} className="py-1.5">
                    <div className="flex justify-between text-body-small">
                      <span>{b.name}</span>
                      <span className="tabular-nums text-on-surface-variant">
                        {usd(b.spent_usd)} / ${b.monthly_budget_usd}
                      </span>
                    </div>
                    <Meter pct={(b.spent_usd / b.monthly_budget_usd!) * 100} tone={b.spent_usd / b.monthly_budget_usd! >= 0.8 ? 'bg-chart-2' : 'bg-primary/70'} className="mt-1 h-1.5" />
                  </div>
                ))}
            </Card>
          )}
        </div>
      </div>
    </SettingsShell>
  )
}
