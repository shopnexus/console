import IconApps from '~icons/material-symbols-light/apps-rounded'
import IconTools from '~icons/material-symbols-light/build-outline-rounded'
import IconHistory from '~icons/material-symbols-light/history-rounded'
import IconListing from '~icons/material-symbols-light/storefront-outline-rounded'
import IconLock from '~icons/material-symbols-light/lock-outline'
import IconData from '~icons/material-symbols-light/monitoring'
import IconOrder from '~icons/material-symbols-light/package-2-outline'
import IconPerson from '~icons/material-symbols-light/person-outline-rounded'
import IconBolt from '~icons/material-symbols-light/bolt-outline-rounded'
import IconCheck from '~icons/material-symbols-light/check-rounded'
import IconError from '~icons/material-symbols-light/error-outline-rounded'
import IconPublic from '~icons/material-symbols-light/public-rounded'
import IconReport from '~icons/material-symbols-light/flag-outline-rounded'
import IconShield from '~icons/material-symbols-light/shield-person-outline-rounded'
import IconSupport from '~icons/material-symbols-light/support-agent-outline'
import IconSee from '~icons/material-symbols-light/visibility-outline'
import { type ReactNode, useState } from 'react'
import { Select } from '../../components/Select'
import { SettingsShell } from '../../components/SettingsShell'
import { Card, IconTile, Initial, Segmented, Spark, Tag } from '../../components/ui'
import { roleName, shortId } from '../../lib/api'
import { dashboards } from '../../lib/dashboards'
import { duration, int, when } from '../../lib/format'
import { type SpendRange, useAgents, useDashboards, useMembers, useSettingsCommands, useToolsUsage } from '../../lib/settings'
import { type ToolGroup, toolInfo, tools } from '../../lib/tools'

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
 * Settings › Tools: the read-only tools server gives the agents, one row
 * each with its calls, failures and p50 over the range and the agents that
 * may call it (an agent's page turns them on and off); the dashboards in the
 * sidebar with the lowest role that opens each; and the latest tool calls.
 */
export function Tools() {
  const [range, setRange] = useState<SpendRange>('7d')
  const agents = useAgents()
  const usage = useToolsUsage(range)
  const floors = useDashboards()
  const members = useMembers()
  const commands = useSettingsCommands()
  const alist = agents.data?.items ?? []
  const usageOf = (name: string) => usage.data?.items.find((u) => u.name === name)
  // The catalogue's tools first, then any tool the server reports that the console has no words for.
  const names = [...tools.map((t) => t.name), ...(usage.data?.items.map((u) => u.name).filter((n) => !tools.some((t) => t.name === n)) ?? [])]
  const calls = usage.data?.items.reduce((n, u) => n + u.calls, 0)
  const days = range === '7d' ? '7 days' : range === '30d' ? '30 days' : '90 days'
  const floorList = floors.data?.items ?? dashboards.map((d) => ({ app: d.app, name: d.name, floor: d.floor }))
  const who = (id: string) => members.data?.items.find((m) => m.id === id)?.display_name ?? shortId(id)
  return (
    <SettingsShell
      title="Tools"
      icon={<IconTools />}
      chips={[
        [<IconSee key="s" width={16} height={16} />, `${tools.length} read-only tools`],
        ...(calls !== undefined ? ([[<IconBolt key="c" width={16} height={16} />, `${int(calls)} calls · ${days}`]] as [ReactNode, ReactNode][]) : []),
        [<IconApps key="a" width={16} height={16} />, `${floorList.length} dashboards`],
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
      <div className="mb-3 flex items-center gap-2 px-1">
        <p className="text-title-small">What agents can read</p>
        <Tag>
          <IconLock width={13} height={13} />
          Read-only
        </Tag>
      </div>
      <Card className="overflow-hidden p-0">
        <div className="rise-list">
          {names.map((name) => {
            const t = toolInfo(name)
            const [icon, tint] = groupLook[t.group]
            const u = usageOf(name)
            const users = alist.filter((a) => a.tools.includes(name))
            return (
              <div key={name} className="flex items-center gap-4 border-t border-hairline px-5 py-3 first:border-t-0 hover:bg-on-surface/3">
                <IconTile size={40} tone={tint}>
                  {icon}
                </IconTile>
                <div className="w-[220px] min-w-0 leading-tight">
                  <p className="truncate text-title-small">{u?.display_name ?? t.label}</p>
                  <p className="mt-0.5 truncate text-label-small font-normal text-on-surface-variant">{name}</p>
                </div>
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="text-body-small text-on-surface-variant">{t.reads}</p>
                  <p className="mt-0.5 truncate text-label-small font-normal text-on-surface-variant">
                    {users.length ? users.map((a) => a.name).join(', ') : 'No agent calls it'}
                  </p>
                </div>
                <div className="w-[130px] text-right leading-tight">
                  {u ? (
                    <>
                      <p className="text-title-medium tabular-nums">{int(u.calls)}</p>
                      <p className="text-label-small font-normal text-on-surface-variant">
                        {u.failed ? <span className="text-error">{int(u.failed)} failed · </span> : null}p50 {duration(u.p50_ms)}
                      </p>
                    </>
                  ) : (
                    <p className="text-body-small text-on-surface-variant">–</p>
                  )}
                </div>
                <span className="w-[110px]">{u && u.days.length > 1 && <Spark values={u.days.map((d) => d.calls)} />}</span>
              </div>
            )
          })}
        </div>
      </Card>
      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[380px_1fr]">
        <div>
          <p className="mb-3 px-1 text-title-small">Tools in the nav</p>
          <Card className="p-4 py-2">
            {floorList.map((d) => {
              const look = dashboards.find((x) => x.app === d.app)
              return (
                <div key={d.app} className="flex items-center gap-3 py-2">
                  <IconTile tone="bg-surface-container text-on-surface-variant">{look?.icon ?? <IconApps width={18} height={18} />}</IconTile>
                  <span className="flex-1 text-title-small">{d.name}</span>
                  <span className="w-[160px]">
                    <Select
                      size="sm"
                      label={`Who opens ${d.name}`}
                      value={d.floor}
                      disabled={!floors.data}
                      onChange={(floor) => commands.updateDashboard.mutate({ app: d.app, floor })}
                      leading={d.floor === 'moderator' ? <IconPublic width={14} height={14} className="text-primary" /> : <IconShield width={14} height={14} className="text-on-surface-variant" />}
                      options={[
                        { value: 'moderator', label: 'Everyone' },
                        { value: 'admin', label: `${roleName.admin}s` },
                      ]}
                    />
                  </span>
                </div>
              )
            })}
          </Card>
        </div>
        <div>
          <p className="mb-3 px-1 text-title-small">Recent calls</p>
          <Card className="overflow-hidden p-0">
            {usage.data?.recent.map((r) => (
              <div key={r.call_id} className="flex items-center gap-4 border-t border-hairline px-4 py-2.5 text-body-small first:border-t-0">
                <Initial name={who(r.member_id)} id={r.member_id} size={24} member />
                <span className="w-[90px] truncate">{who(r.member_id).split(' ').pop()}</span>
                <span className="inline-flex h-6 items-center gap-1 rounded-full bg-surface-container px-2.5 text-label-small font-normal">
                  {r.status === 'failed' ? <IconError width={13} height={13} className="text-error" /> : <IconCheck width={13} height={13} className="text-primary" />}
                  {r.tool}
                </span>
                <span className="min-w-0 flex-1 truncate text-on-surface-variant">{r.label}</span>
                <span className="tabular-nums text-on-surface-variant">{duration(r.duration_ms)}</span>
                <span className="w-16 text-right tabular-nums text-on-surface-variant">{when(r.at)}</span>
              </div>
            ))}
            {usage.data && usage.data.recent.length === 0 && <p className="px-4 py-4 text-body-medium text-on-surface-variant">No calls yet.</p>}
          </Card>
        </div>
      </div>
    </SettingsShell>
  )
}
