import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import IconCategory from '~icons/material-symbols-light/category-outline-rounded'
import IconDownload from '~icons/material-symbols-light/download-rounded'
import IconEvent from '~icons/material-symbols-light/event-note-outline-rounded'
import IconHistory from '~icons/material-symbols-light/history-rounded'
import IconMembers from '~icons/material-symbols-light/group-outline-rounded'
import { groupOf, lookOf } from '../../components/actionLook'
import { Select } from '../../components/Select'
import { SettingsShell } from '../../components/SettingsShell'
import { Btn, Card, CardHead, Initial, Notice } from '../../components/ui'
import { type Action, actionDetail, shortId } from '../../lib/api'
import { firstName, time, when } from '../../lib/format'
import { useActions } from '../../lib/actions'
import { useMemberName, useMembers } from '../../lib/settings'
import { kindName } from '../../lib/sources'

/** Settings › Audit log: every action in the console, newest first, grouped by day; a member filter and a CSV of what is loaded. */
export function Audit() {
  const members = useMembers()
  // The member filter lives in the URL, so a member's panel can link here.
  const [params, setParams] = useSearchParams()
  const member = params.get('member') ?? ''
  const setMember = (id: string) => setParams(id ? { member: id } : {}, { replace: true })
  const memberName = useMemberName()
  const log = useActions(member)
  const items = useMemo(() => log.items ?? [], [log.items])
  const days = useMemo(() => {
    const out: [string, Action[]][] = []
    for (const a of items) {
      const d = /^\d/.test(when(a.at)) ? 'Today' : when(a.at)
      const last = out[out.length - 1]
      if (last && last[0] === d) last[1].push(a)
      else out.push([d, [a]])
    }
    return out
  }, [items])
  const groups = useMemo(() => {
    const m = new Map<string, number>()
    for (const a of items) m.set(groupOf(a.action), (m.get(groupOf(a.action)) ?? 0) + 1)
    return [...m]
  }, [items])

  function exportCsv() {
    const cell = (v: string) => `"${v.replace(/"/g, '""')}"`
    const rows = [
      ['at', 'member', 'action', 'target_kind', 'target_id', 'reason'],
      ...items.map((a) => [a.at, a.actor.display_name ?? 'CLI', a.action, a.target.kind, a.target.id, actionDetail(a, 'reason')]),
    ]
    const blob = new Blob([rows.map((r) => r.map(cell).join(',')).join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <SettingsShell
      title="Audit log"
      icon={<IconHistory />}
      chips={[[<IconEvent key="e" width={16} height={16} />, `${items.length}${log.hasNextPage ? '+' : ''} actions loaded`]]}
    >
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
        <div>
          <div className="mb-4 flex items-center gap-2">
            <span className="w-[220px]">
              <Select
                size="sm"
                label="Member"
                value={member}
                onChange={setMember}
                leading={<IconMembers width={16} height={16} className="text-on-surface-variant" />}
                tone={member ? 'border-primary/40 bg-primary/6 text-primary' : undefined}
                options={[{ value: '', label: 'Everyone' }, ...(members.data?.items.map((m) => ({ value: m.id, label: m.display_name })) ?? [])]}
              />
            </span>
          </div>
          {log.error && <Notice>The audit log did not load.</Notice>}
          <Card className="p-5 pb-1">
            {days.map(([d, rows]) => (
              <div key={d}>
                <p className="mb-3 mt-1 text-label-medium text-on-surface-variant">{d}</p>
                <div className="relative mb-5 before:absolute before:bottom-4 before:left-[18px] before:top-4 before:w-px before:bg-outline-variant/60">
                  {rows.map((a) => {
                    const [verb, icon, tone] = lookOf(a.action)
                    const who = a.actor.display_name ?? 'CLI'
                    const reason = actionDetail(a, 'reason')
                    return (
                      <div key={a.id} className="relative flex gap-4 pb-4 last:pb-0">
                        <span className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-4 ring-surface-container-lowest ${tone}`}>{icon}</span>
                        <div className="-mt-1 flex min-w-0 flex-1 items-start gap-3 rounded-2xl px-3 py-2 hover:bg-on-surface/4">
                          <div className="min-w-0 flex-1">
                            <p className="flex flex-wrap items-center gap-1.5 text-body-medium">
                              <Initial name={who} id={a.actor.member_id ?? 'cli'} size={22} member />
                              <span className="font-semibold">{firstName(who)}</span>
                              {verb}
                              <span className="inline-flex h-7 items-center rounded-full border border-hairline bg-surface-container-lowest px-2.5 text-label-small text-primary">
                                {a.target.kind === 'member' ? (
                                  memberName(a.target.id)
                                ) : (
                                  <>
                                    {kindName(a.target.kind)} <span className="ml-1 tabular-nums">{shortId(a.target.id)}</span>
                                  </>
                                )}
                              </span>
                            </p>
                            {/* The reason is the one the person saw, as written. */}
                            {reason && <p className="mt-1.5 border-l-2 border-primary/40 pl-2.5 text-body-small text-on-surface-variant">{reason}</p>}
                          </div>
                          <span className="pt-1 tabular-nums text-body-small text-on-surface-variant">{time(a.at)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
            {log.data && items.length === 0 && <p className="pb-4 text-body-medium text-on-surface-variant">No actions yet.</p>}
            {log.hasNextPage && (
              <div className="pb-4">
                <Btn kind="ghost" onClick={() => log.fetchNextPage()} disabled={log.isFetchingNextPage}>
                  More
                </Btn>
              </div>
            )}
          </Card>
        </div>
        <div className="space-y-4">
          <Card className="p-5 pb-3">
            <CardHead title="Loaded" />
            {groups.map(([g, n]) => (
              <div key={g} className="flex items-center gap-3 py-1.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">
                  <IconCategory width={16} height={16} />
                </span>
                <span className="flex-1 text-body-medium">{g}</span>
                <span className="text-label-medium tabular-nums">{n}</span>
              </div>
            ))}
          </Card>
          <Btn icon={<IconDownload width={17} height={17} />} onClick={exportCsv} disabled={items.length === 0}>
            Export CSV
          </Btn>
        </div>
      </div>
    </SettingsShell>
  )
}
