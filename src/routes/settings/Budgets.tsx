import { type ReactNode, useState } from 'react'
import IconBell from '~icons/material-symbols-light/notifications-outline-rounded'
import IconBudget from '~icons/material-symbols-light/speed-outline-rounded'
import IconPay from '~icons/material-symbols-light/payments-outline-rounded'
import IconPerson from '~icons/material-symbols-light/person-outline-rounded'
import IconShield from '~icons/material-symbols-light/shield-person-outline-rounded'
import IconTrend from '~icons/material-symbols-light/trending-up-rounded'
import IconTune from '~icons/material-symbols-light/tune-rounded'
import { Select } from '../../components/Select'
import { SettingsShell } from '../../components/SettingsShell'
import { Card, CardHead, Donut, Meter, Notice } from '../../components/ui'
import { fillAt } from '../../lib/aiLook'
import { firstName, usd } from '../../lib/format'
import { type Budgets as BudgetsT, type Spend, useAgents, useBudgets, useSettingsCommands, useSpend } from '../../lib/settings'

/** Settings › Budgets: the month's spend against its cap with a forecast, each agent's budget, and each member's daily budget. */
export function Budgets() {
  const budgets = useBudgets()
  const spend = useSpend('month')
  const agents = useAgents()
  const commands = useSettingsCommands()
  const b = budgets.data
  const s = spend.data
  const alist = agents.data?.items ?? []
  return (
    <SettingsShell
      title="Budgets"
      icon={<IconBudget />}
      chips={
        s && b
          ? [
              [<IconPay key="a" width={16} height={16} />, `${usd(s.total_usd)} / $${b.monthly_cap_usd}`],
              ...(s.projected_usd !== undefined ? ([[<IconTrend key="b" width={16} height={16} />, `Projected ${usd(s.projected_usd)} by month end`]] as [ReactNode, ReactNode][]) : []),
              [<IconBell key="c" width={16} height={16} />, `Alert at ${b.alert_pct}%`],
            ]
          : undefined
      }
    >
      {(budgets.error || spend.error) && <Notice>Budgets did not load.</Notice>}
      {b && s && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_400px]">
          <div className="space-y-4">
            <Card>
              <div className="flex gap-6">
                <Donut parts={[{ pct: (s.total_usd / b.monthly_cap_usd) * 100, tone: 'text-primary' }]} size={168} stroke={18}>
                  <span className="text-label-small font-normal text-on-surface-variant">Used</span>
                  <span className="text-headline-large tabular-nums">${Math.round(s.total_usd)}</span>
                  <span className="text-label-small font-normal tabular-nums text-on-surface-variant">of ${b.monthly_cap_usd}</span>
                </Donut>
                <div className="min-w-0 flex-1">
                  <h2 className="text-title-medium">This month</h2>
                  <div className="mt-3">
                    <Forecast s={s} cap={b.monthly_cap_usd} alertPct={b.alert_pct} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-label-small font-normal text-on-surface-variant">
                    <Legend tone="bg-primary">Used</Legend>
                    {s.projected_usd !== undefined && <Legend tone="bg-primary/40">Projected {usd(s.projected_usd)}</Legend>}
                    <Legend tone="bg-chart-2">Alert {b.alert_pct}%</Legend>
                    <Legend tone="bg-error">Budget</Legend>
                  </div>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3 border-t border-hairline pt-4">
                <NumberField label="Monthly budget" unit="USD" value={b.monthly_cap_usd} onSave={(monthly_cap_usd) => commands.updateBudgets.mutate({ monthly_cap_usd })} />
                <NumberField label="Alert at" unit="%" value={b.alert_pct} onSave={(alert_pct) => commands.updateBudgets.mutate({ alert_pct })} />
                <div>
                  <span className="mb-1.5 block text-body-small text-on-surface-variant">When it runs out</span>
                  <Select
                    label="When it runs out"
                    value={b.on_cap}
                    onChange={(on_cap: BudgetsT['on_cap']) => commands.updateBudgets.mutate({ on_cap })}
                    options={[
                      { value: 'stop_console', label: 'Stop console agents' },
                      { value: 'stop_all', label: 'Stop every agent' },
                    ]}
                  />
                </div>
              </div>
            </Card>
            <Card className="p-5 pb-3">
              <CardHead title="By agent" />
              <div className="grid grid-cols-1 gap-x-8 lg:grid-cols-2">
                {s.by_agent.map((x) => {
                  const i = alist.findIndex((a) => a.id === x.agent_id)
                  const a = alist[i]
                  const cap = a?.monthly_budget_usd
                  const pct = cap ? (x.usd / cap) * 100 : 0
                  return (
                    <div key={x.agent_id} className="py-2">
                      <div className="flex items-center gap-2 text-body-medium">
                        <span className={`h-2.5 w-2.5 rounded-[3px] ${fillAt(i)}`} />
                        <span className="font-medium">{a?.name ?? x.agent_id}</span>
                        <span className="ml-auto tabular-nums">
                          {usd(x.usd)} {cap !== undefined && <span className="text-on-surface-variant">/ ${cap}</span>}
                        </span>
                      </div>
                      {cap !== undefined && <Meter pct={pct} tone={pct >= 80 ? 'bg-chart-2' : fillAt(i)} className="mt-1.5 h-2" />}
                    </div>
                  )
                })}
              </div>
            </Card>
          </div>
          <div className="space-y-4">
            <Card>
              <CardHead title="Per member, per day" />
              <div className="grid grid-cols-2 gap-3">
                <DailyTile
                  icon={<IconPerson width={15} height={15} />}
                  label="Moderator"
                  value={b.member_daily_usd.moderator}
                  onSave={(v) => commands.updateBudgets.mutate({ member_daily_usd: { ...b.member_daily_usd, moderator: v } })}
                />
                <DailyTile
                  icon={<IconShield width={15} height={15} />}
                  label="Admin"
                  value={b.member_daily_usd.admin}
                  onSave={(v) => commands.updateBudgets.mutate({ member_daily_usd: { ...b.member_daily_usd, admin: v } })}
                />
              </div>
              {b.overrides.length > 0 && (
                <p className="mt-3 flex items-center gap-2 text-body-small text-on-surface-variant">
                  <IconTune width={16} height={16} />
                  Overrides: {b.overrides.map((o) => `${firstName(o.display_name)} $${o.daily_usd}`).join(', ')}
                </p>
              )}
            </Card>
          </div>
        </div>
      )}
    </SettingsShell>
  )
}

function Legend({ tone, children }: { tone: string; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-[3px] ${tone}`} />
      {children}
    </span>
  )
}

/** Spend so far as a line, the projection dashed to the month's end, and the alert and budget lines. */
function Forecast({ s, cap, alertPct }: { s: Spend; cap: number; alertPct: number }) {
  const w = 520
  const h = 150
  const end = new Date(s.from)
  end.setMonth(end.getMonth() + 1, 0)
  const days = end.getDate()
  const top = Math.max(cap, s.projected_usd ?? 0) * 1.05
  const daily = s.days.map((d) => Object.values(d.by_agent).reduce((a, b) => a + b, 0))
  const actual = [0, ...daily.map((_, i) => daily.slice(0, i + 1).reduce((a, b) => a + b, 0))]
  const sx = w / days
  const y = (v: number) => h - (v / top) * h
  const pts = actual.map((v, i) => `${(i * sx).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const lx = (actual.length - 1) * sx
  const ly = y(actual[actual.length - 1])
  return (
    <div>
      <svg width="100%" height={h + 8} viewBox={`0 0 ${w} ${h + 8}`} preserveAspectRatio="none" className="block overflow-visible text-primary" aria-label="Spend this month">
        <line x1={0} x2={w} y1={y(cap)} y2={y(cap)} className="stroke-error" strokeDasharray="4 4" opacity={0.6} />
        <line x1={0} x2={w} y1={y((cap * alertPct) / 100)} y2={y((cap * alertPct) / 100)} className="stroke-chart-2" strokeDasharray="2 4" opacity={0.7} />
        <polygon points={`0,${h} ${pts} ${lx},${h}`} fill="currentColor" opacity={0.1} />
        <polyline points={pts} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinejoin="round" />
        {s.projected_usd !== undefined && (
          <line x1={lx} y1={ly} x2={w} y2={y(s.projected_usd)} stroke="currentColor" strokeWidth={2} strokeDasharray="5 5" opacity={0.55} />
        )}
        <circle cx={lx} cy={ly} r={4.5} fill="currentColor" className="stroke-surface-container-lowest" strokeWidth={2} />
      </svg>
      <div className="mt-1 flex justify-between text-label-small font-normal text-on-surface-variant">
        <span>{new Date(s.from).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        <span>Today</span>
        <span>{end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
      </div>
    </div>
  )
}

function NumberField({ label, unit, value, onSave }: { label: string; unit: string; value: number; onSave: (v: number) => void }) {
  const [v, setV] = useState(String(value))
  return (
    <label className="block">
      <span className="mb-1.5 block text-body-small text-on-surface-variant">{label}</span>
      <span className="flex h-10 items-center rounded-xl border border-hairline bg-surface-container-lowest px-3.5 text-body-medium focus-within:border-primary/50">
        <input
          value={v}
          inputMode="numeric"
          onChange={(e) => setV(e.target.value.replace(/[^\d.]/g, '').slice(0, 7))}
          onBlur={() => Number(v) !== value && onSave(Number(v) || 0)}
          className="w-full min-w-0 bg-transparent tabular-nums outline-none"
        />
        <span className="text-on-surface-variant">{unit}</span>
      </span>
    </label>
  )
}

function DailyTile({ icon, label, value, onSave }: { icon: ReactNode; label: string; value: number; onSave: (v: number) => void }) {
  const [v, setV] = useState(String(value))
  return (
    <label className="block rounded-2xl bg-surface-container-low p-3.5 focus-within:ring-2 focus-within:ring-primary/30">
      <span className="flex items-center gap-1.5 text-body-small text-on-surface-variant">
        {icon}
        {label}
      </span>
      <span className="mt-1 flex items-baseline">
        <span className="text-headline-medium">$</span>
        <input
          value={v}
          inputMode="numeric"
          onChange={(e) => setV(e.target.value.replace(/[^\d.]/g, '').slice(0, 5))}
          onBlur={() => Number(v) !== value && onSave(Number(v) || 0)}
          className="w-full min-w-0 bg-transparent text-headline-medium tabular-nums outline-none"
        />
      </span>
    </label>
  )
}
