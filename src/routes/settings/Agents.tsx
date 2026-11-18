import { type ReactNode, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import IconSpark from '~icons/material-symbols/auto-awesome-outline-rounded'
import IconAdd from '~icons/material-symbols-light/add-rounded'
import IconBack from '~icons/material-symbols-light/arrow-back-rounded'
import IconCheck from '~icons/material-symbols-light/check-rounded'
import IconChevron from '~icons/material-symbols-light/chevron-right-rounded'
import IconDesktop from '~icons/material-symbols-light/desktop-windows-outline-rounded'
import IconHistory from '~icons/material-symbols-light/history-rounded'
import IconLock from '~icons/material-symbols-light/lock-outline'
import IconModel from '~icons/material-symbols-light/neurology-outline-rounded'
import IconPay from '~icons/material-symbols-light/payments-outline-rounded'
import { AgentIcon, ModelTag } from '../../components/AiBits'
import { ModelPicker } from '../../components/ModelPicker'
import { SettingsShell } from '../../components/SettingsShell'
import { Btn, Card, CardHead, Meter, Notice, Tag, Toggle } from '../../components/ui'
import { fillAt } from '../../lib/aiLook'
import { ApiError, shortId } from '../../lib/api'
import { day, usd } from '../../lib/format'
import {
  type AgentLimits,
  type AiAgent,
  aliasOf,
  settingsFailure,
  useAgent,
  useAgents,
  useAgentVersions,
  useBudgets,
  useMembers,
  useModels,
  useProviders,
  useSettingsCommands,
} from '../../lib/settings'
import { toolInfo, tools as toolList } from '../../lib/tools'

/** Settings › Agents: each purpose is an agent with a readable name, its required tags, its model and its budget. */
export function Agents() {
  const agents = useAgents()
  const budgets = useBudgets()
  const commands = useSettingsCommands()
  const navigate = useNavigate()
  const items = agents.data?.items ?? []
  const spentOf = (id: string) => budgets.data?.agents.find((b) => b.agent_id === id)?.spent_usd
  const spend = budgets.data?.agents.reduce((s, b) => s + b.spent_usd, 0)
  return (
    <SettingsShell
      title="Agents"
      icon={<IconSpark />}
      art
      chips={[
        [<IconSpark key="a" width={16} height={16} />, `${items.filter((a) => a.enabled).length} agents on`],
        ...(spend !== undefined ? ([[<IconPay key="b" width={16} height={16} />, `${usd(spend)} this period`]] as [ReactNode, ReactNode][]) : []),
      ]}
      actions={
        <Btn kind="primary" icon={<IconAdd width={17} height={17} />} onClick={() => navigate('/settings/agents/new')}>
          Create agent
        </Btn>
      }
    >
      {agents.error && <Notice>Agents did not load.</Notice>}
      <div className="rise-list grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {items.map((a, i) => {
          const spent = spentOf(a.id)
          return (
            <Card key={a.id} className="p-5">
              <div className="flex items-start gap-3">
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-3xl text-white ${fillAt(i)}`}>
                  <AgentIcon name={a.icon} size={24} />
                </span>
                <Link to={`/settings/agents/${a.id}`} className="min-w-0 flex-1 leading-tight">
                  <p className="text-title-large hover:underline">{a.name}</p>
                  <p className="mt-1 text-body-small text-on-surface-variant">{a.purpose}</p>
                </Link>
                {a.kind === 'console' ? (
                  <Toggle on={a.enabled} label={a.enabled ? `Turn ${a.name} off` : `Turn ${a.name} on`} onChange={(on) => commands.updateAgent.mutate({ id: a.id, enabled: on })} />
                ) : (
                  <Tag tone="bg-surface-container text-on-surface-variant">App</Tag>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {a.required_tags.map((t) => (
                  <ModelTag key={t} name={t} small />
                ))}
              </div>
              <Link to={`/settings/agents/${a.id}`} className="mt-4 flex items-center gap-2.5 rounded-2xl bg-surface-container-low px-3 py-2.5 hover:bg-surface-container">
                <IconModel width={18} height={18} className="text-primary" />
                <span className="flex-1 truncate text-label-medium">{a.model || 'No model yet'}</span>
                <IconChevron width={18} height={18} className="text-on-surface-variant" />
              </Link>
              {spent !== undefined && (
                <div className="mt-4">
                  <div className="flex justify-between text-body-small">
                    <span className="font-medium tabular-nums">{usd(spent)}</span>
                    <span className="tabular-nums text-on-surface-variant">{a.monthly_budget_usd !== undefined ? `of $${a.monthly_budget_usd} a month` : 'No budget'}</span>
                  </div>
                  {a.monthly_budget_usd ? <Meter pct={(spent / a.monthly_budget_usd) * 100} tone={spent / a.monthly_budget_usd >= 0.8 ? 'bg-chart-2' : fillAt(i)} className="mt-1.5 h-1.5" /> : null}
                </div>
              )}
            </Card>
          )
        })}
        <Link
          to="/settings/agents/new"
          className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-outline-variant/70 text-on-surface-variant hover:border-primary/40"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/8 text-primary">
            <IconAdd width={26} height={26} />
          </span>
          <span className="text-title-small">Create agent</span>
        </Link>
      </div>
    </SettingsShell>
  )
}

interface Draft {
  name: string
  alias: string
  icon: string
  purpose: string
  required_tags: string[]
  model: string
  instructions: string
  tools: string[]
  limits: AgentLimits
  monthly_budget_usd?: number
}

const blank: Draft = {
  name: '',
  alias: '',
  icon: 'spark',
  purpose: '',
  required_tags: ['Chat', 'Tool use'],
  model: '',
  instructions: '',
  tools: ['ticket_get', 'account_get', 'listing_get'],
  limits: { deadline_s: 60 },
}

/** One agent: name and use, required tags and model, instructions with versions, tools, limits and budget. "new" creates a console agent. */
export function AgentPage() {
  const { id } = useParams()
  const isNew = id === 'new'
  const agent = useAgent(isNew ? undefined : id)
  if (!isNew && !agent.data) {
    return (
      <SettingsShell title="Agent" icon={<IconSpark />}>
        {(agent.error || agent.missing) && <Notice>{agent.missing ? 'There is no such agent.' : 'This agent did not load.'}</Notice>}
      </SettingsShell>
    )
  }
  return <AgentForm key={agent.data?.id ?? 'new'} agent={agent.data} />
}

function AgentForm({ agent }: { agent?: AiAgent }) {
  const navigate = useNavigate()
  const models = useModels()
  const providers = useProviders()
  const budgets = useBudgets()
  const members = useMembers()
  const commands = useSettingsCommands()
  const [draft, setDraft] = useState<Draft>(() =>
    agent
      ? {
          name: agent.name,
          alias: agent.alias,
          icon: agent.icon,
          purpose: agent.purpose,
          required_tags: agent.required_tags,
          model: agent.model,
          instructions: agent.instructions ?? '',
          tools: agent.tools,
          limits: agent.limits,
          monthly_budget_usd: agent.monthly_budget_usd,
        }
      : { ...blank },
  )
  const [aliasTouched, setAliasTouched] = useState(!!agent)
  const [editing, setEditing] = useState(!agent)
  const [showVersions, setShowVersions] = useState(false)
  const versions = useAgentVersions(agent?.id, showVersions)
  const [tagMenu, setTagMenu] = useState(false)
  const set = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }))
  const save = agent ? commands.updateAgent : commands.createAgent
  const allTags = models.data?.tags.map((t) => t.name) ?? []
  // An app agent is called by server's code: only its model, limits and budget change.
  const app = agent?.kind === 'app'
  const spent = agent ? budgets.data?.agents.find((b) => b.agent_id === agent.id)?.spent_usd : undefined
  const who = (id?: string) => (id ? (members.data?.items.find((m) => m.id === id)?.display_name ?? shortId(id)) : '')

  useEffect(() => {
    if (commands.createAgent.data) navigate(`/settings/agents/${commands.createAgent.data.id}`, { replace: true })
  }, [commands.createAgent.data, navigate])

  function submit() {
    if (!agent) {
      commands.createAgent.mutate({ ...draft, alias: draft.alias || aliasOf(draft.name) })
      return
    }
    const budget = draft.monthly_budget_usd === agent.monthly_budget_usd ? {} : { monthly_budget_usd: draft.monthly_budget_usd ?? null }
    const body = app
      ? { model: draft.model, limits: draft.limits, ...budget }
      : {
          name: draft.name,
          icon: draft.icon,
          purpose: draft.purpose,
          required_tags: draft.required_tags,
          model: draft.model,
          instructions: draft.instructions,
          tools: draft.tools,
          limits: draft.limits,
          ...budget,
        }
    commands.updateAgent.mutate({ id: agent.id, ...body }, { onSuccess: () => setEditing(false) })
  }

  const chips: [ReactNode, ReactNode][] = []
  if (agent) {
    chips.push([<IconModel key="m" width={16} height={16} />, agent.model || 'No model'])
    if (spent !== undefined) chips.push([<IconPay key="p" width={16} height={16} />, `${usd(spent)}${agent.monthly_budget_usd !== undefined ? ` / $${agent.monthly_budget_usd}` : ''}`])
  }
  const input = 'h-11 w-full rounded-xl border border-hairline bg-surface-container-lowest px-3.5 text-body-medium outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 disabled:text-on-surface-variant'
  const lines = draft.instructions.split('\n')
  const limit = (k: keyof AgentLimits) => (v: number | undefined) => set({ limits: { ...draft.limits, [k]: v } })

  return (
    <SettingsShell
      title={agent ? agent.name : 'New agent'}
      icon={<AgentIcon name={draft.icon} />}
      chips={chips}
      actions={
        <>
          <Btn kind="ghost" icon={<IconBack width={17} height={17} />} onClick={() => navigate('/settings/agents')}>
            Agents
          </Btn>
          {agent?.kind === 'console' && (
            <Btn icon={<IconSpark width={17} height={17} />} onClick={() => navigate(`/?agent=${agent.id}`)}>
              Try in a new chat
            </Btn>
          )}
          <Btn kind="primary" icon={<IconCheck width={17} height={17} />} onClick={submit} disabled={save.isPending || !draft.name.trim() || !draft.model}>
            Save
          </Btn>
        </>
      }
    >
      {save.error && (
        <div className="mb-4">
          <Notice>{settingsFailure(save.error instanceof ApiError ? save.error.code : undefined)}</Notice>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card>
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="mb-1.5 block text-body-small text-on-surface-variant">Name</span>
                <input
                  value={draft.name}
                  disabled={app}
                  onChange={(e) => set({ name: e.target.value, ...(aliasTouched ? {} : { alias: aliasOf(e.target.value) }) })}
                  maxLength={80}
                  className={`${input} font-medium`}
                />
              </label>
              {agent ? (
                <div>
                  <span className="mb-1.5 block text-body-small text-on-surface-variant">Used in</span>
                  <p className="flex h-11 items-center gap-2 rounded-xl border border-hairline bg-surface-container-lowest px-3.5 text-body-medium">
                    <IconDesktop width={17} height={17} className="text-on-surface-variant" />
                    {app ? 'The app' : 'Console · the ask box'}
                  </p>
                </div>
              ) : (
                <label className="block">
                  <span className="mb-1.5 block text-body-small text-on-surface-variant">Alias in LiteLLM</span>
                  <input
                    value={draft.alias}
                    onChange={(e) => {
                      setAliasTouched(true)
                      set({ alias: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 63) })
                    }}
                    className={`${input} tabular-nums`}
                  />
                </label>
              )}
            </div>
            <label className="mt-4 block">
              <span className="mb-1.5 block text-body-small text-on-surface-variant">Purpose</span>
              <input value={draft.purpose} disabled={app} onChange={(e) => set({ purpose: e.target.value })} maxLength={500} className={input} />
            </label>
            <p className="mb-1.5 mt-4 text-body-small text-on-surface-variant">Required tags</p>
            <div className="relative flex flex-wrap items-center gap-1.5">
              {draft.required_tags.map((t) => (
                <button key={t} type="button" title={app ? t : `Remove ${t}`} disabled={app} onClick={() => set({ required_tags: draft.required_tags.filter((x) => x !== t) })}>
                  <ModelTag name={t} />
                </button>
              ))}
              {!app && (
                <button
                  type="button"
                  onClick={() => setTagMenu((o) => !o)}
                  className="inline-flex h-7 items-center gap-1 rounded-full border border-dashed border-outline-variant px-2.5 text-label-small font-normal text-on-surface-variant"
                >
                  <IconAdd width={14} height={14} />
                  Tag
                </button>
              )}
              {tagMenu && (
                <div className="absolute left-0 top-9 z-20 w-[240px] animate-pop rounded-3xl border border-hairline bg-surface-container-lowest p-1.5 shadow-float">
                  {allTags
                    .filter((t) => !draft.required_tags.includes(t))
                    .map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          set({ required_tags: [...draft.required_tags, t] })
                          setTagMenu(false)
                        }}
                        className="flex w-full rounded-lg px-1.5 py-1 hover:bg-surface-container-low"
                      >
                        <ModelTag name={t} small />
                      </button>
                    ))}
                </div>
              )}
            </div>
            <p className="mb-1.5 mt-4 text-body-small text-on-surface-variant">Model</p>
            <ModelPicker models={models.data?.items ?? []} providers={providers.data?.items ?? []} required={draft.required_tags} value={draft.model} onChange={(model) => set({ model })} />
          </Card>
          {!app && (
            <Card>
              <CardHead
                title="Instructions"
                right={
                  <div className="relative flex items-center gap-2">
                    {agent && (
                      <Btn kind="ghost" icon={<IconHistory width={17} height={17} />} onClick={() => setShowVersions((s) => !s)}>
                        Version {agent.instructions_version}
                        {agent.instructions_version > 1 ? ` · ${agent.instructions_version - 1} earlier` : ''}
                      </Btn>
                    )}
                    {!editing && <Btn onClick={() => setEditing(true)}>Edit</Btn>}
                    {showVersions && (
                      <div className="absolute right-0 top-11 z-20 w-[300px] animate-pop space-y-1 rounded-3xl border border-hairline bg-surface-container-lowest p-2 shadow-float">
                        {versions.data?.items.map((v, i) => (
                          <button
                            key={v.version}
                            type="button"
                            onClick={() => {
                              set({ instructions: v.instructions })
                              setEditing(true)
                              setShowVersions(false)
                            }}
                            className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left text-body-small hover:bg-surface-container-low"
                          >
                            <span className={`h-2 w-2 rounded-full ${i === 0 ? 'bg-primary' : 'bg-outline-variant'}`} />
                            <span className="font-medium">Version {v.version}</span>
                            <span className="truncate text-on-surface-variant">{who(v.created_by)}</span>
                            <span className="ml-auto tabular-nums text-on-surface-variant">{day(v.created_at)}</span>
                          </button>
                        ))}
                        {versions.data?.items.length === 0 && <p className="px-1.5 py-1 text-body-small text-on-surface-variant">No earlier versions.</p>}
                      </div>
                    )}
                  </div>
                }
              />
              {editing ? (
                <textarea
                  value={draft.instructions}
                  onChange={(e) => set({ instructions: e.target.value })}
                  rows={Math.max(6, lines.length + 1)}
                  maxLength={20000}
                  className="w-full resize-y rounded-2xl border border-hairline bg-surface-container-low/50 p-4 text-body-medium outline-none focus:border-primary/50"
                />
              ) : (
                <div className="space-y-1.5 rounded-2xl border border-hairline bg-surface-container-low/50 p-4 text-body-medium">
                  {lines.map((l, i) => (
                    <div key={i} className="flex gap-4">
                      <span className="w-4 shrink-0 select-none text-right tabular-nums text-on-surface-variant/60">{i + 1}</span>
                      <span>
                        {l.split(/(\{\{[a-z_]+\}\})/).map((part, j) =>
                          /^\{\{[a-z_]+\}\}$/.test(part) ? (
                            <span key={j} className="rounded-md bg-primary/10 px-1.5 text-primary">
                              {part.slice(2, -2).replace(/_/g, ' ')}
                            </span>
                          ) : (
                            part
                          ),
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
        <div className="space-y-4">
          {!app && (
            <Card className="p-5 pb-3">
              <CardHead
                title="Tools"
                right={
                  <Tag>
                    <IconLock width={13} height={13} />
                    Read-only
                  </Tag>
                }
              />
              {toolList.map((t) => (
                <div key={t.name} className="flex items-center gap-2.5 py-1.5">
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block text-body-medium">{toolInfo(t.name).label}</span>
                    <span className="block truncate text-label-small font-normal text-on-surface-variant">{t.reads}</span>
                  </span>
                  <Toggle
                    on={draft.tools.includes(t.name)}
                    label={t.label}
                    onChange={(v) => set({ tools: v ? [...draft.tools, t.name] : draft.tools.filter((x) => x !== t.name) })}
                  />
                </div>
              ))}
            </Card>
          )}
          <Card>
            <CardHead title="Limits" sub="Empty takes the agent service's default" />
            <div className="grid grid-cols-2 gap-2.5">
              {app ? (
                <NumberTile label="Per call" unit="sec" value={draft.limits.timeout_s} onChange={limit('timeout_s')} />
              ) : (
                <>
                  <NumberTile label="Per answer" unit="sec" value={draft.limits.deadline_s} max={300} onChange={limit('deadline_s')} />
                  <NumberTile label="Model calls" unit="calls" value={draft.limits.max_model_calls} onChange={limit('max_model_calls')} />
                  <NumberTile label="Context" unit="tokens" value={draft.limits.context_window} onChange={limit('context_window')} />
                  <NumberTile label="Answer length" unit="tokens" value={draft.limits.max_tokens} onChange={limit('max_tokens')} />
                  <NumberTile label="Per tool call" unit="sec" value={draft.limits.tool_timeout_s} onChange={limit('tool_timeout_s')} />
                  <NumberTile label="Tool attempts" unit="tries" value={draft.limits.tool_attempts} onChange={limit('tool_attempts')} />
                </>
              )}
              <NumberTile label="Budget" unit="/month" prefix="$" value={draft.monthly_budget_usd} onChange={(v) => set({ monthly_budget_usd: v })} />
            </div>
          </Card>
        </div>
      </div>
    </SettingsShell>
  )
}

/** A number field on a tile; empty means unset. */
function NumberTile({
  label,
  unit,
  value,
  onChange,
  prefix,
  max,
}: {
  label: string
  unit: string
  value: number | undefined
  onChange: (v: number | undefined) => void
  prefix?: string
  max?: number
}) {
  return (
    <label className="block rounded-2xl bg-surface-container-low p-3 focus-within:ring-2 focus-within:ring-primary/30">
      <span className="block text-label-small font-normal text-on-surface-variant">{label}</span>
      <span className="mt-0.5 flex items-baseline gap-1">
        {prefix && <span className="text-title-large">{prefix}</span>}
        <input
          inputMode="numeric"
          value={value ?? ''}
          placeholder="–"
          onChange={(e) => {
            const digits = e.target.value.replace(/[^\d.]/g, '')
            onChange(digits === '' ? undefined : Math.min(max ?? Infinity, Number(digits)))
          }}
          className="w-full min-w-0 bg-transparent text-title-large tabular-nums outline-none placeholder:text-on-surface-variant"
        />
        <span className="shrink-0 text-body-small text-on-surface-variant">{unit}</span>
      </span>
    </label>
  )
}
