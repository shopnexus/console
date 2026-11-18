import IconApps from '~icons/material-symbols-light/apps-rounded'
import IconTools from '~icons/material-symbols-light/build-outline-rounded'
import IconHistory from '~icons/material-symbols-light/history-rounded'
import IconListing from '~icons/material-symbols-light/storefront-outline-rounded'
import IconLock from '~icons/material-symbols-light/lock-outline'
import IconData from '~icons/material-symbols-light/monitoring'
import IconOrder from '~icons/material-symbols-light/package-2-outline'
import IconPerson from '~icons/material-symbols-light/person-outline-rounded'
import IconPublic from '~icons/material-symbols-light/public-rounded'
import IconReport from '~icons/material-symbols-light/flag-outline-rounded'
import IconShield from '~icons/material-symbols-light/shield-person-outline-rounded'
import IconSupport from '~icons/material-symbols-light/support-agent-outline'
import IconSee from '~icons/material-symbols-light/visibility-outline'
import type { ReactNode } from 'react'
import { SettingsShell } from '../../components/SettingsShell'
import { Card, IconTile, Tag } from '../../components/ui'
import { fillAt } from '../../lib/aiLook'
import { roleName } from '../../lib/api'
import { dashboards } from '../../lib/dashboards'
import { useAgents } from '../../lib/settings'
import { type ToolGroup, tools } from '../../lib/tools'

const groupLook: Record<ToolGroup, [ReactNode, string]> = {
  ticket: [<IconSupport key="t" width={20} height={20} />, 'bg-primary/8 text-primary'],
  account: [<IconPerson key="a" width={20} height={20} />, 'bg-secondary-container text-on-secondary-container'],
  order: [<IconOrder key="o" width={20} height={20} />, 'bg-tertiary-fixed text-on-tertiary-fixed-variant'],
  listing: [<IconListing key="l" width={20} height={20} />, 'bg-inverse-primary/40 text-primary-container'],
  report: [<IconReport key="r" width={20} height={20} />, 'bg-error-container text-error'],
  log: [<IconHistory key="h" width={20} height={20} />, 'bg-surface-container text-on-surface-variant'],
  data: [<IconData key="d" width={20} height={20} />, 'bg-surface-container text-on-surface-variant'],
}

/**
 * Settings › Tools: the read-only tools server gives the agents, with the
 * agents that may call each (an agent's own page turns them on and off),
 * and the dashboards in the sidebar with the lowest role that opens each.
 */
export function Tools() {
  const agents = useAgents()
  const alist = agents.data?.items ?? []
  return (
    <SettingsShell
      title="Tools"
      icon={<IconTools />}
      chips={[
        [<IconSee key="s" width={16} height={16} />, `${tools.length} read-only tools`],
        [<IconApps key="a" width={16} height={16} />, `${dashboards.length} dashboards`],
      ]}
    >
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_340px]">
        <div>
          <div className="mb-3 flex items-center gap-2 px-1">
            <p className="text-title-small">What agents can read</p>
            <Tag>
              <IconLock width={13} height={13} />
              Read-only
            </Tag>
          </div>
          <div className="rise-list grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {tools.map((t) => {
              const [icon, tint] = groupLook[t.group]
              const users = alist.filter((a) => a.tools.includes(t.name))
              return (
                <Card key={t.name} className="p-4">
                  <div className="flex items-start gap-3">
                    <IconTile size={40} tone={tint}>
                      {icon}
                    </IconTile>
                    <div className="min-w-0 flex-1 leading-tight">
                      <p className="text-title-small">{t.label}</p>
                      <p className="mt-0.5 text-label-small font-normal text-on-surface-variant">{t.name}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-body-small text-on-surface-variant">{t.reads}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {users.length === 0 && <span className="text-label-small font-normal text-on-surface-variant">No agent calls it</span>}
                    {users.map((a) => (
                      <span key={a.id} className="inline-flex h-6 items-center gap-1.5 rounded-full border border-hairline bg-surface-container-lowest px-2 text-label-small font-normal">
                        <span className={`h-2 w-2 rounded-full ${fillAt(alist.indexOf(a))}`} />
                        {a.name}
                      </span>
                    ))}
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
        <div>
          <p className="mb-3 px-1 text-title-small">Tools in the sidebar</p>
          <Card className="p-4 py-2">
            {dashboards.map((d) => (
              <div key={d.app} className="flex items-center gap-3 py-2">
                <IconTile tone="bg-surface-container text-on-surface-variant">{d.icon}</IconTile>
                <span className="flex-1 text-title-small">{d.name}</span>
                {d.floor === 'moderator' ? (
                  <Tag>
                    <IconPublic width={13} height={13} />
                    Everyone
                  </Tag>
                ) : (
                  <Tag tone="bg-surface-container text-on-surface-variant">
                    <IconShield width={13} height={13} />
                    {roleName.admin}
                  </Tag>
                )}
              </div>
            ))}
          </Card>
        </div>
      </div>
    </SettingsShell>
  )
}

