import { type ReactNode, useState } from 'react'
import { Link } from 'react-router'
import IconBadge from '~icons/material-symbols-light/badge-outline'
import IconBlock from '~icons/material-symbols-light/do-not-disturb-on-outline-rounded'
import IconCheck from '~icons/material-symbols-light/check-circle-outline-rounded'
import IconGuard from '~icons/material-symbols-light/verified-user-outline-rounded'
import IconLoop from '~icons/material-symbols-light/all-inclusive-rounded'
import IconLog from '~icons/material-symbols-light/receipt-long-outline-rounded'
import IconShield from '~icons/material-symbols-light/shield-outline-rounded'
import IconSpeed from '~icons/material-symbols-light/speed-outline-rounded'
import { SettingsShell } from '../../components/SettingsShell'
import { Card, CardHead, IconTile, Initial, Segmented } from '../../components/ui'
import { shortId } from '../../lib/api'
import { int, when } from '../../lib/format'
import { type SpendRange, useGuardrails, useMembers } from '../../lib/settings'

// The agent's guardrails (agent/src/guardrails). They are always on and set
// in code; the run shows each block as a notice, and the counts come from the
// same guardrail events.
const rules: { rule?: string; icon: ReactNode; tone: string; title: string; detail: string }[] = [
  { rule: 'pii_masked', icon: <IconBadge width={20} height={20} />, tone: 'bg-primary/8 text-primary', title: 'Mask personal data', detail: 'Phone numbers, emails, card and ID numbers are masked in answers' },
  { rule: 'off_topic', icon: <IconBlock width={20} height={20} />, tone: 'bg-tertiary-fixed text-on-tertiary-fixed-variant', title: 'Block off-topic', detail: 'Refuses requests unrelated to tickets, reports and accounts' },
  { rule: 'loop_stopped', icon: <IconLoop width={20} height={20} />, tone: 'bg-error-container text-error', title: 'Loop detection', detail: 'Stops a run that calls one tool the same way three times' },
  { rule: 'rate_limited', icon: <IconSpeed width={20} height={20} />, tone: 'bg-secondary-container text-on-secondary-container', title: 'Rate limit', detail: '30 questions a minute per member' },
  { icon: <IconLog width={20} height={20} />, tone: 'bg-surface-container text-on-surface-variant', title: 'Tool call log', detail: 'Who asked, which tool, which record' },
]

const lookOf = (rule: string) => rules.find((r) => r.rule === rule) ?? { icon: <IconShield width={16} height={16} />, tone: 'bg-surface-container text-on-surface-variant', title: rule.replace(/_/g, ' ') }

/** Settings › Guardrails: what the agent refuses or changes in every run, how often over the range, and the latest blocks. */
export function Guardrails() {
  const [range, setRange] = useState<SpendRange>('7d')
  const stats = useGuardrails(range)
  const members = useMembers()
  const countOf = (rule?: string) => (rule ? stats.data?.items.find((x) => x.rule === rule)?.count : undefined)
  const total = stats.data?.items.reduce((n, x) => n + x.count, 0)
  const days = range === '7d' ? '7 days' : range === '30d' ? '30 days' : '90 days'
  const who = (id: string) => members.data?.items.find((m) => m.id === id)?.display_name ?? shortId(id)
  return (
    <SettingsShell
      title="Guardrails"
      icon={<IconGuard />}
      chips={[
        [<IconCheck key="c" width={16} height={16} />, `${rules.length}/${rules.length} on`],
        ...(total !== undefined ? ([[<IconShield key="s" width={16} height={16} />, `${int(total)} blocks · ${days}`]] as [ReactNode, ReactNode][]) : []),
      ]}
      actions={
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
    >
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        <div className="rise-list grid grid-cols-1 gap-3 lg:grid-cols-2">
          {rules.map((r) => {
            const n = countOf(r.rule)
            return (
              <Card key={r.title} className="p-4">
                <div className="flex items-start gap-3">
                  <IconTile size={40} tone={r.tone}>
                    {r.icon}
                  </IconTile>
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="text-title-small">{r.title}</p>
                    <p className="mt-0.5 text-body-small text-on-surface-variant">{r.detail}</p>
                  </div>
                </div>
                {r.rule && (
                  <div className="mt-4">
                    <p className="text-headline-medium tabular-nums">{n !== undefined ? int(n) : stats.data ? '0' : '–'}</p>
                    <p className="text-label-small font-normal text-on-surface-variant">blocks · {days}</p>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
        <Card>
          <CardHead
            title="Recent"
            right={
              <Link to="/settings/audit" className="text-label-medium text-primary">
                Audit log
              </Link>
            }
          />
          <div className="relative before:absolute before:bottom-4 before:left-4 before:top-4 before:w-px before:bg-outline-variant/60">
            {stats.data?.recent.map((h, i) => {
              const look = lookOf(h.rule)
              return (
                <div key={i} className="relative flex gap-3 pb-4 last:pb-0">
                  <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full [&>svg]:h-4 [&>svg]:w-4 ${look.tone}`}>{look.icon}</span>
                  <div className="min-w-0 flex-1 pt-1 leading-tight">
                    <p className="text-body-medium">{h.detail || look.title}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-body-small text-on-surface-variant">
                      <Initial name={who(h.member_id)} id={h.member_id} size={16} member />
                      {who(h.member_id).split(' ').pop()} · {when(h.at)}
                    </p>
                  </div>
                </div>
              )
            })}
            {stats.data && stats.data.recent.length === 0 && <p className="text-body-medium text-on-surface-variant">No blocks.</p>}
          </div>
        </Card>
      </div>
    </SettingsShell>
  )
}
