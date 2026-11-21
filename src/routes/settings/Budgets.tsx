import { type ReactNode, useState } from 'react'
import IconBell from '~icons/material-symbols-light/notifications-outline-rounded'
import IconBudget from '~icons/material-symbols-light/speed-outline-rounded'
import IconPay from '~icons/material-symbols-light/payments-outline-rounded'
import IconPerson from '~icons/material-symbols-light/person-outline-rounded'
import IconShield from '~icons/material-symbols-light/shield-person-outline-rounded'
import IconTune from '~icons/material-symbols-light/tune-rounded'
import { MoneyField } from '../../components/MoneyField'
import { Select } from '../../components/Select'
import { RangePicker, SettingsShell } from '../../components/SettingsShell'
import { useNumberDraft } from '../../lib/draft'
import { Card, CardHead, Donut, Meter, Notice, Tag } from '../../components/ui'
import { fillAt } from '../../lib/aiLook'
import { day, firstName, usd } from '../../lib/format'
import { budgetUse, type OnCap, settingsFailure, type SpendRange, useAgents, useBudgets, useMemberName, useSettingsCommands, useSpend } from '../../lib/settings'
import { SpendBars } from './SpendBars'

/**
 * Settings › Budgets: the month's spend against its cap with the alert, spend
 * over a range, each agent's monthly budget, and each member's daily budget
 * by role with overrides.
 */
export function Budgets() {
  const [range, setRange] = useState<SpendRange>('30d')
  const budgets = useBudgets()
  const spend = useSpend(range)
  const agents = useAgents()
  const nameOf = useMemberName()
  const commands = useSettingsCommands()
  const b = budgets.data
  const s = spend.data
  const order = agents.data?.items.map((a) => a.id) ?? []
  const failure = commands.updateBudgets.error
  const month = b?.agents.reduce((sum, x) => sum + x.spent_usd, 0) ?? 0
  const cap = b?.monthly_cap_usd
  return (
    <SettingsShell
      title="Budgets"
      icon={<IconBudget />}
      chips={
        b && [
          [<IconPay key="a" width={16} height={16} />, cap ? `${usd(month)} / $${cap}` : `${usd(month)} this month`],
          b.alert_pct !== undefined && [<IconBell key="b" width={16} height={16} />, `Alert at ${b.alert_pct}%`],
        ]
      }
    >
      {(budgets.error || spend.error) && <Notice>{settingsFailure(budgets.error ?? spend.error)}</Notice>}
      {failure && (
        <div className="mb-4">
          <Notice>{settingsFailure(failure)}</Notice>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_400px]">
        <div className="space-y-4">
          {b && (
            <Card>
              <div className="flex gap-6">
                <Donut parts={cap ? [{ pct: (month / cap) * 100, tone: b.alerting ? 'text-on-surface' : 'text-primary' }] : []} size={168} stroke={18}>
                  <span className="text-label-small font-normal text-on-surface-variant">Used</span>
                  <span className="text-headline-large tabular-nums">${Math.round(month)}</span>
                  {cap && <span className="text-label-small font-normal tabular-nums text-on-surface-variant">of ${cap}</span>}
                </Donut>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="flex-1 text-title-medium">This month</h2>
                    {b.alerting && <Tag tone="bg-primary/8 text-primary">Past the alert</Tag>}
                  </div>
                  {cap && (
                    <div className="relative mt-4">
                      <Meter pct={(month / cap) * 100} tone={b.alerting ? 'bg-on-surface' : 'bg-primary'} className="h-3" />
                      {b.alert_pct !== undefined && <span className="absolute -top-1 h-5 w-0.5 rounded-full bg-on-surface" style={{ left: `${b.alert_pct}%` }} title={`Alert at ${b.alert_pct}%`} />}
                    </div>
                  )}
                  <div className="mt-5 grid grid-cols-3 gap-3 border-t border-hairline pt-4">
                    <Labeled label="Monthly budget">
                      <MoneyField key={`cap-${cap}`} value={cap} label="Monthly budget" onSave={(v) => commands.updateBudgets.mutate({ monthly_cap_usd: v ?? null })} />
                    </Labeled>
                    <Labeled label="Alert at">
                      <NumberField key={`alert-${b.alert_pct}`} value={b.alert_pct} unit="%" label="Alert at" onSave={(v) => v !== undefined && commands.updateBudgets.mutate({ alert_pct: Math.min(100, v) })} />
                    </Labeled>
                    <Labeled label="When it runs out">
                      <Select
                        label="When it runs out"
                        value={b.on_cap}
                        onChange={(on_cap: OnCap) => commands.updateBudgets.mutate({ on_cap })}
                        options={[
                          { value: 'stop_agents', label: 'Stop agents' },
                          { value: 'alert_only', label: 'Alert only' },
                        ]}
                      />
                    </Labeled>
                  </div>
                </div>
              </div>
            </Card>
          )}
          <Card>
            <CardHead
              title="Spend"
              sub={s ? `${usd(s.total_usd)} · ${day(s.start)} to ${day(s.end)}` : undefined}
              right={
                <RangePicker value={range} onChange={setRange} />
              }
            />
            {s && <SpendBars s={s} agents={agents.data?.items ?? []} />}
          </Card>
          {b && (
            <Card className="p-5 pb-3">
              <CardHead title="By agent" sub="A month's budget each; spent is LiteLLM's count for the current period" />
              {b.agents.map((x) => {
                const i = Math.max(0, order.indexOf(x.agent_id))
                const { pct, near } = budgetUse(x.spent_usd, x.monthly_budget_usd)
                return (
                  <div key={x.agent_id} className="flex items-center gap-4 border-t border-hairline py-3 first:border-t-0">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-[3px] ${fillAt(i)}`} />
                    <span className="w-[200px] min-w-0 truncate text-label-medium">
                      {x.name} {x.kind === 'app' && <Tag tone="bg-surface-container text-on-surface-variant">App</Tag>}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between text-body-small">
                        <span className="tabular-nums">{usd(x.spent_usd)}</span>
                        {x.monthly_budget_usd !== undefined && <span className="tabular-nums text-on-surface-variant">{Math.round(pct)}%</span>}
                      </div>
                      {x.monthly_budget_usd !== undefined && <Meter pct={pct} tone={near ? 'bg-on-surface' : fillAt(i)} className="mt-1.5 h-2" />}
                    </div>
                    <MoneyField
                      key={`${x.agent_id}-${x.monthly_budget_usd}`}
                      value={x.monthly_budget_usd}
                      label={`${x.name}'s monthly budget`}
                      suffix="/mo"
                      onSave={(v) => commands.updateBudgets.mutate({ agents: [{ agent_id: x.agent_id, monthly_budget_usd: v ?? null }] })}
                    />
                  </div>
                )
              })}
            </Card>
          )}
        </div>
        <div className="space-y-4">
          {b && (
            <Card>
              <CardHead title="Per member, per day" sub="Through the console agents" />
              <div className="grid grid-cols-2 gap-3">
                {(['moderator', 'admin'] as const).map((role) => (
                  <div key={role} className="rounded-2xl bg-surface-container-low p-3.5">
                    <p className="flex items-center gap-1.5 text-body-small text-on-surface-variant">
                      {role === 'admin' ? <IconShield width={15} height={15} /> : <IconPerson width={15} height={15} />}
                      {role === 'admin' ? 'Admin' : 'Moderator'}
                    </p>
                    <MoneyField
                      key={`${role}-${b.member_daily_usd?.[role]}`}
                      big
                      value={b.member_daily_usd?.[role]}
                      label={`A ${role}'s daily budget`}
                      onSave={(v) =>
                        commands.updateBudgets.mutate({
                          member_daily_usd: { moderator: b.member_daily_usd?.moderator ?? 0, admin: b.member_daily_usd?.admin ?? 0, [role]: v ?? 0 },
                        })
                      }
                    />
                  </div>
                ))}
              </div>
              {(b.overrides?.length ?? 0) > 0 && (
                <div className="mt-4 space-y-1">
                  <p className="flex items-center gap-2 text-body-small text-on-surface-variant">
                    <IconTune width={16} height={16} />
                    Overrides
                  </p>
                  {b.overrides!.map((o) => (
                    <div key={o.member_id} className="flex items-center gap-3 py-1">
                      <span className="flex-1 text-body-medium">{firstName(nameOf(o.member_id))}</span>
                      <MoneyField
                        key={`${o.member_id}-${o.daily_usd}`}
                        value={o.daily_usd}
                        label={`${nameOf(o.member_id)}'s daily budget`}
                        suffix="/day"
                        onSave={(v) =>
                          commands.updateBudgets.mutate({
                            overrides: (b.overrides ?? []).flatMap((x) => (x.member_id !== o.member_id ? [x] : v === undefined ? [] : [{ ...x, daily_usd: v }])),
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </SettingsShell>
  )
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <span className="mb-1.5 block text-body-small text-on-surface-variant">{label}</span>
      {children}
    </div>
  )
}

function NumberField({ value, label, unit, onSave }: { value?: number; label: string; unit: string; onSave: (v: number | undefined) => void }) {
  const draft = useNumberDraft(value, onSave, { digits: 3, decimals: false })
  return (
    <label className="flex h-10 items-baseline rounded-xl border border-hairline bg-surface-container-lowest px-3 text-body-medium focus-within:border-primary/50">
      <input
        {...draft}
        aria-label={label}
        inputMode="numeric"
        className="h-full w-full min-w-0 bg-transparent tabular-nums outline-none"
      />
      <span className="text-on-surface-variant">{unit}</span>
    </label>
  )
}
