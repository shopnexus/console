import { type ReactNode, useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import IconSpark from '~icons/material-symbols/auto-awesome-outline-rounded'
import IconAdd from '~icons/material-symbols-light/add-rounded'
import IconArrow from '~icons/material-symbols-light/arrow-forward-rounded'
import IconBack from '~icons/material-symbols-light/arrow-back-rounded'
import IconBalance from '~icons/material-symbols-light/balance-rounded'
import IconBolt from '~icons/material-symbols-light/bolt-outline-rounded'
import IconCheck from '~icons/material-symbols-light/check-rounded'
import IconCheckCircle from '~icons/material-symbols-light/check-circle-outline-rounded'
import IconChevron from '~icons/material-symbols-light/chevron-right-rounded'
import IconChecklist from '~icons/material-symbols-light/checklist-rounded'
import IconClose from '~icons/material-symbols-light/close-rounded'
import IconCloud from '~icons/material-symbols-light/cloud-outline'
import IconDrag from '~icons/material-symbols-light/drag-indicator'
import IconError from '~icons/material-symbols-light/error-outline-rounded'
import IconEven from '~icons/material-symbols-light/autorenew-rounded'
import IconFallback from '~icons/material-symbols-light/low-priority-rounded'
import IconModel from '~icons/material-symbols-light/neurology-outline-rounded'
import IconPause from '~icons/material-symbols-light/pause-circle-outline-rounded'
import IconReplay from '~icons/material-symbols-light/replay-rounded'
import IconSearch from '~icons/material-symbols-light/search-rounded'
import IconSwap from '~icons/material-symbols-light/swap-horiz-rounded'
import IconSync from '~icons/material-symbols-light/sync-rounded'
import IconTimer from '~icons/material-symbols-light/timer-outline'
import { ModelTag, ProviderTile } from '../../components/AiBits'
import { SettingsShell } from '../../components/SettingsShell'
import { Btn, Card, Dot, IconBtn, Meter, Notice, Segmented, Spark, Tag, Toggle } from '../../components/ui'
import { price, textAt } from '../../lib/aiLook'
import { useDismiss } from '../../lib/dom'
import { duration, time } from '../../lib/format'
import {
  type Provider,
  type ProviderInput,
  type ProviderKind,
  providerKindName,
  type Rotation,
  useProvider,
  useProviderModels,
  useProviders,
  useRotation,
  useSettingsCommands,
} from '../../lib/settings'

/** The 24 h success rate over every provider's requests. */
function success(list: Provider[]): number | undefined {
  const total = list.reduce((s, p) => s + (p.stats_24h?.requests ?? 0), 0)
  if (!total) return undefined
  return list.reduce((s, p) => s + (p.stats_24h?.requests ?? 0) * (p.stats_24h?.success_pct ?? 0), 0) / total
}

const strategyName: Record<Rotation['strategy'], string> = { weighted: 'By weight', even: 'Even', fallback: 'Fallback in order' }

/** Settings › Providers: the rotation LiteLLM applies and each provider with its weight, share and health. */
export function Providers() {
  const providers = useProviders()
  const rotation = useRotation()
  const commands = useSettingsCommands()
  const navigate = useNavigate()
  const list = providers.data?.items ?? []
  const running = list.filter((p) => p.enabled && p.status === 'healthy').length
  const ok = success(list)
  const [dragging, setDragging] = useState<string>()

  // A drop puts the dragged provider in the target's place and renumbers the fallback order.
  function drop(target: string) {
    if (!dragging || dragging === target) return
    const ids = list.map((p) => p.id).filter((id) => id !== dragging)
    ids.splice(ids.indexOf(target), 0, dragging)
    ids.forEach((id, i) => {
      if (list.find((p) => p.id === id)?.order !== i + 1) commands.updateProvider.mutate({ id, order: i + 1 })
    })
    setDragging(undefined)
  }

  return (
    <SettingsShell
      title="Providers"
      icon={<IconCloud />}
      chips={[
        [<IconCloud key="c" width={16} height={16} />, `${list.length} providers · ${running} running`],
        ...(rotation.data ? ([[<IconSwap key="s" width={16} height={16} />, `Rotating ${strategyName[rotation.data.strategy].toLowerCase()}`]] as [ReactNode, ReactNode][]) : []),
        ...(ok !== undefined ? ([[<IconCheckCircle key="k" width={16} height={16} />, `${ok.toFixed(1)}% success`]] as [ReactNode, ReactNode][]) : []),
      ]}
      actions={
        <Btn kind="primary" icon={<IconAdd width={17} height={17} />} onClick={() => navigate('/settings/providers/new')}>
          Add provider
        </Btn>
      }
    >
      {providers.error && <Notice>Providers did not load.</Notice>}
      {rotation.data && <RotationCard r={rotation.data} providers={list} success={ok} />}
      <div className="mb-3 mt-5 flex items-center gap-2 px-1">
        <p className="text-title-small">Providers</p>
        <span className="text-body-small text-on-surface-variant">Drag to change the fallback order</span>
      </div>
      <div className="rise-list space-y-3">
        {list.map((p, i) => {
          const bad = p.status !== 'healthy'
          return (
            <div
              key={p.id}
              draggable
              onDragStart={() => setDragging(p.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => drop(p.id)}
              className={dragging === p.id ? 'opacity-50' : ''}
            >
              <Card className="p-4">
                <div className="flex items-center gap-4">
                  <span className="cursor-grab text-outline">
                    <IconDrag width={20} height={20} />
                  </span>
                  <ProviderTile name={p.name} index={i} size={44} />
                  <div className="w-[210px] min-w-0 leading-tight">
                    <p className="truncate text-title-medium">{p.name}</p>
                    <p className="mt-0.5 truncate text-body-small text-on-surface-variant">
                      {providerKindName[p.kind]} · <span className="tabular-nums">{p.key_hint}</span>
                    </p>
                  </div>
                  <div className="w-[96px] leading-tight">
                    <p className="text-label-small font-normal text-on-surface-variant">Models</p>
                    <Link to={`/settings/providers/${p.id}`} className="mt-0.5 flex items-center gap-0.5 text-title-medium tabular-nums text-primary">
                      {p.model_count}
                      <IconChevron width={16} height={16} />
                    </Link>
                  </div>
                  <WeightField p={p} />
                  <div className="min-w-0 flex-1 leading-tight">
                    <div className="flex justify-between text-label-small font-normal text-on-surface-variant">
                      <span>24h requests</span>
                      <span className="tabular-nums">{p.stats_24h?.share_pct ?? 0}%</span>
                    </div>
                    <Meter pct={p.stats_24h?.share_pct ?? 0} tone={bad ? 'bg-error' : 'bg-primary'} className="mt-1.5 h-2" />
                    <p className="mt-1.5 truncate tabular-nums text-body-small text-on-surface-variant">
                      {bad ? (p.last_error ?? 'Failing') : p.stats_24h ? `${p.stats_24h.success_pct}% · p50 ${duration(p.stats_24h.p50_ms)}` : '–'}
                    </p>
                  </div>
                  {p.stats_24h?.series && <Spark values={p.stats_24h.series} w={96} tone={bad ? 'text-error' : textAt(i)} />}
                  <span className="w-[180px] text-right">
                    {bad ? (
                      <Tag tone="bg-error-container text-error">
                        <IconPause width={14} height={14} />
                        {p.paused_until ? `Paused until ${time(p.paused_until)}` : 'Failing'}
                      </Tag>
                    ) : (
                      <Tag>
                        <Dot />
                        Healthy
                      </Tag>
                    )}
                  </span>
                  <Toggle on={p.enabled} label={p.enabled ? `Turn ${p.name} off` : `Turn ${p.name} on`} onChange={(on) => commands.updateProvider.mutate({ id: p.id, enabled: on })} />
                </div>
              </Card>
            </div>
          )
        })}
      </div>
    </SettingsShell>
  )
}

/** A provider's weight, saved when the field loses focus. */
function WeightField({ p }: { p: Provider }) {
  const commands = useSettingsCommands()
  const [v, setV] = useState(String(p.weight))
  return (
    <label className="w-[110px] leading-tight">
      <span className="block text-label-small font-normal text-on-surface-variant">Weight</span>
      <span className="mt-1 flex h-8 w-[84px] items-center rounded-lg border border-hairline bg-surface-container-lowest px-2.5 text-body-medium focus-within:border-primary/50">
        <input
          value={v}
          inputMode="numeric"
          onChange={(e) => setV(e.target.value.replace(/\D/g, '').slice(0, 3))}
          onBlur={() => Number(v) !== p.weight && commands.updateProvider.mutate({ id: p.id, weight: Number(v) || 0 })}
          className="w-full min-w-0 bg-transparent tabular-nums outline-none"
        />
        <span className="text-on-surface-variant">%</span>
      </span>
    </label>
  )
}

function RotationCard({ r, providers, success }: { r: Rotation; providers: Provider[]; success?: number }) {
  const commands = useSettingsCommands()
  const running = providers.filter((p) => p.enabled)
  return (
    <Card>
      <div className="flex flex-wrap items-start gap-6">
        <div className="min-w-0 flex-1">
          <h2 className="text-title-medium">Rotation</h2>
          <div className="mt-3">
            <Segmented
              label="Rotation"
              value={r.strategy}
              onChange={(strategy) => commands.updateRotation.mutate({ strategy })}
              items={[
                { value: 'weighted', label: 'By weight', icon: <IconBalance width={16} height={16} /> },
                { value: 'even', label: 'Even', icon: <IconEven width={16} height={16} /> },
                { value: 'fallback', label: 'Fallback in order', icon: <IconFallback width={16} height={16} /> },
              ]}
            />
          </div>
          <div className="mt-4 flex items-center gap-3">
            <span className="flex h-10 items-center gap-2 whitespace-nowrap rounded-full bg-surface-container-lowest px-3.5 text-body-small shadow-soft">
              <IconSpark width={16} height={16} className="text-primary" />
              Agent calls
            </span>
            <IconArrow width={18} height={18} className="text-outline" />
            <span className="flex h-10 items-center gap-2 whitespace-nowrap rounded-full bg-primary px-3.5 text-label-medium text-on-primary">
              <IconSwap width={18} height={18} />
              LiteLLM
            </span>
            <IconArrow width={18} height={18} className="text-outline" />
            <span className="flex -space-x-2">
              {running.map((p) => (
                <ProviderTile key={p.id} name={p.name} index={providers.indexOf(p)} size={34} />
              ))}
            </span>
            <span className="whitespace-nowrap text-body-small text-on-surface-variant">providers with the model</span>
          </div>
        </div>
        <div className="grid w-[440px] grid-cols-2 gap-3">
          <RotationNumber icon={<IconReplay width={15} height={15} />} label="Switch provider on error" unit="times" value={r.num_retries} onSave={(num_retries) => commands.updateRotation.mutate({ num_retries })} />
          <RotationNumber
            icon={<IconPause width={15} height={15} />}
            label="Pause a failing provider"
            unit="min"
            value={Math.round(r.cooldown_s / 60)}
            onSave={(m) => commands.updateRotation.mutate({ cooldown_s: m * 60 })}
          />
          <RotationNumber icon={<IconTimer width={15} height={15} />} label="Timeout per try" unit="sec" value={r.timeout_s} onSave={(timeout_s) => commands.updateRotation.mutate({ timeout_s })} />
          <div className="rounded-2xl bg-surface-container-low p-3.5">
            <p className="flex items-center gap-1.5 text-label-small font-normal text-on-surface-variant">
              <IconCheckCircle width={15} height={15} />
              24h success
            </p>
            <p className="mt-1 text-title-large tabular-nums">{success !== undefined ? `${success.toFixed(1)}%` : '–'}</p>
          </div>
        </div>
      </div>
    </Card>
  )
}

function RotationNumber({ icon, label, unit, value, onSave }: { icon: ReactNode; label: string; unit: string; value: number; onSave: (v: number) => void }) {
  const [v, setV] = useState(String(value))
  return (
    <label className="block rounded-2xl bg-surface-container-low p-3.5 focus-within:ring-2 focus-within:ring-primary/30">
      <span className="flex items-center gap-1.5 text-label-small font-normal text-on-surface-variant">
        {icon}
        {label}
      </span>
      <span className="mt-1 flex items-baseline gap-1">
        <input
          value={v}
          inputMode="numeric"
          onChange={(e) => setV(e.target.value.replace(/\D/g, '').slice(0, 4))}
          onBlur={() => Number(v) !== value && onSave(Number(v) || 0)}
          style={{ width: `${Math.max(1, v.length) + 0.5}ch` }}
          className="min-w-0 bg-transparent text-title-large tabular-nums outline-none"
        />
        <span className="text-body-small text-on-surface-variant">{unit}</span>
      </span>
    </label>
  )
}

const kinds = Object.keys(providerKindName) as ProviderKind[]

/** One provider: its connection on the start side, its models and how they are kept on the end side. "new" adds one. */
export function ProviderPage() {
  const { id } = useParams()
  const isNew = id === 'new'
  const provider = useProvider(isNew ? undefined : id)
  if (!isNew && !provider.data) {
    return (
      <SettingsShell title="Provider" icon={<IconCloud />}>
        {provider.error && <Notice>This provider did not load.</Notice>}
      </SettingsShell>
    )
  }
  return <ProviderForm key={provider.data?.id ?? 'new'} provider={provider.data} />
}

function ProviderForm({ provider }: { provider?: Provider }) {
  const navigate = useNavigate()
  const providers = useProviders()
  const commands = useSettingsCommands()
  const [draft, setDraft] = useState<ProviderInput>(() =>
    provider
      ? { name: provider.name, kind: provider.kind, base_url: provider.base_url, weight: provider.weight, order: provider.order }
      : { name: '', kind: 'openai_compatible', base_url: '', api_key: '', weight: 0, order: (providers.data?.items.length ?? 0) + 1 },
  )
  const [changingKey, setChangingKey] = useState(!provider)
  const set = (patch: Partial<ProviderInput>) => setDraft((d) => ({ ...d, ...patch }))
  const index = provider ? (providers.data?.items.findIndex((p) => p.id === provider.id) ?? 0) : (providers.data?.items.length ?? 0)
  const test = commands.testProvider
  const save = provider ? commands.updateProvider : commands.createProvider

  useEffect(() => {
    if (commands.createProvider.data) navigate(`/settings/providers/${commands.createProvider.data.id}`, { replace: true })
  }, [commands.createProvider.data, navigate])

  function submit() {
    const body = { ...draft, api_key: changingKey && draft.api_key ? draft.api_key : undefined }
    if (provider) commands.updateProvider.mutate({ id: provider.id, ...body }, { onSuccess: () => setChangingKey(false) })
    else commands.createProvider.mutate(body)
  }

  const input = 'h-11 w-full rounded-xl border border-hairline bg-surface-container-lowest px-3.5 text-body-medium outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10'
  const label = 'mb-1.5 block text-body-small text-on-surface-variant'
  const s = provider?.stats_24h

  return (
    <SettingsShell
      title={provider?.name ?? 'New provider'}
      icon={<IconCloud />}
      chips={
        s
          ? [
              [<IconSwap key="a" width={16} height={16} />, `${s.share_pct}% of requests · 24 hours`],
              [<IconCheckCircle key="b" width={16} height={16} />, `${s.success_pct}% success`],
              [<IconBolt key="c" width={16} height={16} />, `p50 ${duration(s.p50_ms)}`],
            ]
          : undefined
      }
      actions={
        <>
          <Btn kind="ghost" icon={<IconBack width={17} height={17} />} onClick={() => navigate('/settings/providers')}>
            Providers
          </Btn>
          <Btn kind="primary" icon={<IconCheck width={17} height={17} />} onClick={submit} disabled={save.isPending || !draft.name.trim() || !draft.base_url.trim()}>
            Save
          </Btn>
        </>
      }
    >
      {save.error && (
        <div className="mb-4">
          <Notice>That did not save.</Notice>
        </div>
      )}
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[380px_1fr]">
        <Card>
          <h2 className="mb-4 text-title-medium">Connection</h2>
          <div className="space-y-3">
            <label className="block">
              <span className={label}>Name</span>
              <input value={draft.name} onChange={(e) => set({ name: e.target.value })} className={input} />
            </label>
            <label className="block">
              <span className={label}>Type</span>
              <span className="relative flex items-center">
                <span className="pointer-events-none absolute left-3">
                  <ProviderTile name={draft.name || '?'} index={index} size={22} />
                </span>
                <select value={draft.kind} onChange={(e) => set({ kind: e.target.value as ProviderKind })} className={`${input} appearance-none pl-11`}>
                  {kinds.map((k) => (
                    <option key={k} value={k}>
                      {providerKindName[k]}
                    </option>
                  ))}
                </select>
              </span>
            </label>
            <label className="block">
              <span className={label}>Base URL</span>
              <input value={draft.base_url} onChange={(e) => set({ base_url: e.target.value })} className={input} />
            </label>
            <div>
              <span className={label}>API key</span>
              {changingKey ? (
                <input type="password" autoComplete="off" value={draft.api_key ?? ''} onChange={(e) => set({ api_key: e.target.value })} className={input} />
              ) : (
                <p className="flex h-11 items-center gap-2 rounded-xl border border-hairline bg-surface-container-lowest px-3.5 text-body-medium">
                  <span className="flex-1 tabular-nums">{provider?.key_hint}</span>
                  <button type="button" onClick={() => setChangingKey(true)} className="font-medium text-primary">
                    Change
                  </button>
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className={label}>Weight</span>
                <span className={`${input} flex items-center`}>
                  <input
                    value={draft.weight}
                    inputMode="numeric"
                    onChange={(e) => set({ weight: Number(e.target.value.replace(/\D/g, '').slice(0, 3)) || 0 })}
                    className="w-full min-w-0 bg-transparent tabular-nums outline-none"
                  />
                  %
                </span>
              </label>
              <label className="block">
                <span className={label}>Fallback order</span>
                <input
                  value={draft.order}
                  inputMode="numeric"
                  onChange={(e) => set({ order: Number(e.target.value.replace(/\D/g, '').slice(0, 2)) || 1 })}
                  className={`${input} tabular-nums`}
                />
              </label>
            </div>
          </div>
          {provider && (
            <div
              className={`mt-4 flex items-center gap-2 rounded-2xl px-3.5 py-3 text-body-small ${
                test.data && !test.data.ok ? 'bg-error-container text-error' : 'bg-primary/6 text-primary'
              }`}
            >
              {test.data && !test.data.ok ? <IconError width={18} height={18} /> : <IconCheckCircle width={18} height={18} />}
              <span className="flex-1">
                {test.isPending
                  ? 'Testing…'
                  : test.data
                    ? test.data.ok
                      ? `Connected · ${test.data.models} models · ${test.data.latency_ms} ms`
                      : (test.data.error ?? 'Did not connect')
                    : 'Not tested since opening'}
              </span>
              <button type="button" onClick={() => test.mutate(provider.id)} disabled={test.isPending} className="font-medium">
                {test.data ? 'Test again' : 'Test'}
              </button>
            </div>
          )}
        </Card>
        {provider && <ProviderModelsCard provider={provider} />}
      </div>
    </SettingsShell>
  )
}

function ProviderModelsCard({ provider }: { provider: Provider }) {
  const models = useProviderModels(provider.id)
  const commands = useSettingsCommands()
  const [adding, setAdding] = useState(false)
  const [q, setQ] = useState('')
  const close = useCallback(() => setAdding(false), [])
  const ref = useDismiss<HTMLDivElement>(adding, close)
  const items = models.data?.items ?? []
  const available = models.data?.available ?? []
  const needle = q.trim().toLowerCase()
  const sync = provider.models_mode === 'sync'
  return (
    <div>
      <div className="mb-3 flex items-center gap-3 px-1">
        <p className="text-title-small">{provider.name}'s models</p>
        <Tag tone="bg-surface-container text-on-surface-variant">
          {items.length}/{items.length + available.length}
        </Tag>
        <span className="flex-1" />
        <Segmented
          label="How models are kept"
          value={provider.models_mode}
          onChange={(models_mode) => commands.updateProvider.mutate({ id: provider.id, models_mode })}
          items={[
            { value: 'pick', label: 'Pick models', icon: <IconChecklist width={16} height={16} /> },
            { value: 'sync', label: 'All, kept in sync', icon: <IconSync width={16} height={16} /> },
          ]}
        />
      </div>
      <Card className="overflow-hidden p-0">
        {items.map((m) => (
          <div key={m.ident} className="flex items-center gap-4 border-t border-hairline px-5 py-3 first:border-t-0 hover:bg-on-surface/3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
              <IconModel width={18} height={18} />
            </span>
            <span className="w-[200px] min-w-0 leading-tight">
              <span className="block truncate text-title-small">{m.model}</span>
              <span className="block truncate text-body-small text-on-surface-variant">{m.ident}</span>
            </span>
            <span className="flex min-w-0 flex-1 flex-wrap gap-1">
              {m.tags.map((t) => (
                <ModelTag key={t} name={t} small />
              ))}
            </span>
            <span className="w-[90px] tabular-nums text-body-small">{price(m.price_in_usd, m.price_out_usd)}</span>
            {!sync && (
              <IconBtn
                title={`Remove from ${provider.name}`}
                className="hover:text-error"
                onClick={() => commands.removeProviderModel.mutate({ id: provider.id, model: m.model })}
              >
                <IconClose width={18} height={18} />
              </IconBtn>
            )}
          </div>
        ))}
        {models.data && items.length === 0 && <p className="px-5 py-5 text-body-medium text-on-surface-variant">No models added.</p>}
      </Card>
      {!sync && (
        <div ref={ref} className="relative mt-3">
          <button
            type="button"
            onClick={() => setAdding((o) => !o)}
            className="flex h-11 w-full items-center gap-2 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/3 px-4 text-label-medium text-primary"
          >
            <IconAdd width={18} height={18} />
            Add model
          </button>
          {adding && (
            <div className="absolute left-0 top-[52px] z-20 w-[460px] animate-pop rounded-4xl border border-hairline bg-surface-container-lowest p-2 shadow-float">
              <label className="flex h-10 items-center gap-2 rounded-xl bg-surface-container-low px-3 text-on-surface-variant">
                <IconSearch width={18} height={18} />
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={`Search ${provider.name}'s models`}
                  className="h-full min-w-0 flex-1 bg-transparent text-body-medium text-on-surface outline-none placeholder:text-on-surface-variant"
                />
              </label>
              <p className="px-3 pb-1 pt-2.5 text-label-small font-normal text-on-surface-variant">Not added · {available.length}</p>
              {available
                .filter((m) => !needle || m.model.toLowerCase().includes(needle))
                .map((m) => (
                  <div key={m.ident} className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-surface-container-low">
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block text-label-medium">{m.model}</span>
                      <span className="mt-1 flex flex-wrap gap-1">
                        {m.tags.map((t) => (
                          <ModelTag key={t} name={t} small />
                        ))}
                      </span>
                    </span>
                    <Btn
                      icon={<IconAdd width={15} height={15} />}
                      className="text-primary"
                      disabled={commands.addProviderModel.isPending}
                      onClick={() => commands.addProviderModel.mutate({ id: provider.id, model: m.model })}
                    >
                      Add
                    </Btn>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
