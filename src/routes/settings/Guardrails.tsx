import type { ReactNode } from 'react'
import { Link } from 'react-router'
import IconBadge from '~icons/material-symbols-light/badge-outline'
import IconBlock from '~icons/material-symbols-light/do-not-disturb-on-outline-rounded'
import IconCheck from '~icons/material-symbols-light/check-circle-outline-rounded'
import IconGuard from '~icons/material-symbols-light/verified-user-outline-rounded'
import IconLoop from '~icons/material-symbols-light/all-inclusive-rounded'
import IconLog from '~icons/material-symbols-light/receipt-long-outline-rounded'
import IconSpeed from '~icons/material-symbols-light/speed-outline-rounded'
import { SettingsShell } from '../../components/SettingsShell'
import { Card, IconTile } from '../../components/ui'

// The agent's guardrails (agent/src/guardrails). They are always on and set
// in code; the run shows each block as a notice, and the audit log keeps them.
const rules: [ReactNode, string, string][] = [
  [<IconBadge key="b" width={20} height={20} />, 'Mask personal data', 'Phone numbers, emails, card and ID numbers are masked in answers'],
  [<IconBlock key="o" width={20} height={20} />, 'Block off-topic', 'Refuses requests unrelated to tickets, reports and accounts'],
  [<IconLoop key="l" width={20} height={20} />, 'Loop detection', 'Stops a run that calls one tool the same way three times'],
  [<IconSpeed key="r" width={20} height={20} />, 'Rate limit', '30 questions a minute per member'],
  [<IconLog key="g" width={20} height={20} />, 'Tool call log', 'Who asked, which tool, which record'],
]

/** Settings › Guardrails: what the agent refuses or changes, in every run. */
export function Guardrails() {
  return (
    <SettingsShell title="Guardrails" icon={<IconGuard />} chips={[[<IconCheck key="c" width={16} height={16} />, `${rules.length}/${rules.length} on`]]}>
      <div className="rise-list grid grid-cols-1 gap-3 lg:grid-cols-2">
        {rules.map(([icon, title, detail]) => (
          <Card key={title} className="p-4">
            <div className="flex items-start gap-3">
              <IconTile size={40}>{icon}</IconTile>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="text-title-small">{title}</p>
                <p className="mt-0.5 text-body-small text-on-surface-variant">{detail}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
      <div className="mt-4">
        <Link to="/settings/audit" className="inline-flex h-9 items-center rounded-full px-4 text-label-medium text-primary hover:bg-surface-container-low">
          Audit log
        </Link>
      </div>
    </SettingsShell>
  )
}
