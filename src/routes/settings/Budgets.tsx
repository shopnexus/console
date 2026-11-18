import { type ReactNode, useState } from 'react'
import IconBudget from '~icons/material-symbols-light/speed-outline-rounded'
import IconPay from '~icons/material-symbols-light/payments-outline-rounded'
import IconPerson from '~icons/material-symbols-light/person-outline-rounded'
import { SettingsShell } from '../../components/SettingsShell'
import { Card, CardHead, Meter, Notice, Segmented, Tag } from '../../components/ui'
import { fillAt } from '../../lib/aiLook'
import { ApiError } from '../../lib/api'
import { day, usd } from '../../lib/format'
import { settingsFailure, type SpendRange, useAgents, useBudgets, useSettingsCommands, useSpend } from '../../lib/settings'
import { SpendBars } from './SpendBars'

/** Settings › Budgets: spend over a range, each agent's monthly budget against what it spent, and each member's daily budget. */
export function Budgets() {
  const [range, setRange] = useState<SpendRange>('30d')
  const budgets = useBudgets()
  const spend = useSpend(range)
  const agents = useAgents()
  const commands = useSettingsCommands()
  const b = budgets.data
  const s = spend.data
  const order = agents.data?.items.map((a) => a.id) ?? []
  const failure = commands.updateBudgets.error
  return (
    <SettingsShell
      title="Budgets"
      icon={<IconBudget />}
      chips={
        s
          ? ([
              [<IconPay key="a" width={16} height={16} />, `${usd(s.total_usd)} in ${range === '7d' ? '7' : range === '30d' ? '30' : '90'} days`],
              ...(b?.member_daily_usd !== undefined ? [[<IconPerson key="b" width={16} height={16} />, `$${b.member_daily_usd} a member a day`]] : []),
            ] as [ReactNode, ReactNode][])
          : undefined
      }
    >
      {(budgets.error || spend.error) && <Notice>{settingsFailure(((budgets.error ?? spend.error) as ApiError | null)?.code)}</Notice>}
      {failure && (
        <div className="mb-4">
          <Notice>{settingsFailure(failure instanceof ApiError ? failure.code : undefined)}</Notice>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <Card>
            <CardHead
              title="Spend"
              sub={s ? `${usd(s.total_usd)} · ${day(s.start)} to ${day(s.end)}` : undefined}
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
            {s && <SpendBars s={s} order={order} names={Object.fromEntries((agents.data?.items ?? []).map((a) => [a.id, a.name]))} />}
          </Card>
          {b && (
            <Card className="p-5 pb-3">
              <CardHead title="By agent" sub="A month's budget each; spent is LiteLLM's count for the current period" />
              {b.agents.map((x) => {
                const i = Math.max(0, order.indexOf(x.agent_id))
                const pct = x.monthly_budget_usd ? (x.spent_usd / x.monthly_budget_usd) * 100 : 0
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
                      {x.monthly_budget_usd !== undefined && <Meter pct={pct} tone={pct >= 80 ? 'bg-chart-2' : fillAt(i)} className="mt-1.5 h-2" />}
                    </div>
                    <MoneyField
                      key={`${x.agent_id}-${x.monthly_budget_usd}`}
                      value={x.monthly_budget_usd}
                      label={`${x.name}'s monthly budget`}
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
              <MoneyField
                key={String(b.member_daily_usd)}
                big
                value={b.member_daily_usd}
                label="Each member's daily budget"
                onSave={(v) => commands.updateBudgets.mutate({ member_daily_usd: v ?? null })}
              />
            </Card>
          )}
        </div>
      </div>
    </SettingsShell>
  )
}

/** A dollar amount saved when the field loses focus; empty takes the budget away. */
function MoneyField({ value, label, onSave, big = false }: { value?: number; label: string; onSave: (v: number | undefined) => void; big?: boolean }) {
  const [v, setV] = useState(value === undefined ? '' : String(value))
  return (
    <label className={`flex items-baseline rounded-xl border border-hairline bg-surface-container-lowest px-3 focus-within:border-primary/50 ${big ? 'h-14 text-headline-medium' : 'h-10 w-[120px] text-body-medium'}`}>
      <span className="text-on-surface-variant">$</span>
      <input
        value={v}
        aria-label={label}
        placeholder="None"
        inputMode="decimal"
        onChange={(e) => setV(e.target.value.replace(/[^\d.]/g, '').slice(0, 8))}
        onBlur={() => {
          const n = v === '' ? undefined : Number(v)
          if (n !== value) onSave(n)
        }}
        className="h-full w-full min-w-0 bg-transparent tabular-nums outline-none placeholder:text-on-surface-variant"
      />
      {!big && <span className="text-body-small text-on-surface-variant">/mo</span>}
    </label>
  )
}
