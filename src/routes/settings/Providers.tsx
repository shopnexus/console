import { type ReactNode, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import IconSpark from '~icons/material-symbols/auto-awesome-outline-rounded'
import IconAdd from '~icons/material-symbols-light/add-rounded'
import IconArrow from '~icons/material-symbols-light/arrow-forward-rounded'
import IconBack from '~icons/material-symbols-light/arrow-back-rounded'
import IconBalance from '~icons/material-symbols-light/balance-rounded'
import IconBolt from '~icons/material-symbols-light/bolt-outline-rounded'
import IconCheck from '~icons/material-symbols-light/check-rounded'
import IconCheckCircle from '~icons/material-symbols-light/check-circle-outline-rounded'
import IconChecklist from '~icons/material-symbols-light/checklist-rounded'
import IconChevron from '~icons/material-symbols-light/chevron-right-rounded'
import IconClose from '~icons/material-symbols-light/close-rounded'
import IconCloud from '~icons/material-symbols-light/cloud-outline'
import IconDrag from '~icons/material-symbols-light/drag-indicator'
import IconError from '~icons/material-symbols-light/error-outline-rounded'
import IconFallback from '~icons/material-symbols-light/low-priority-rounded'
import IconModel from '~icons/material-symbols-light/neurology-outline-rounded'
import IconPause from '~icons/material-symbols-light/pause-circle-outline-rounded'
import IconReplay from '~icons/material-symbols-light/replay-rounded'
import IconSpeed from '~icons/material-symbols-light/speed-outline-rounded'
import IconSwap from '~icons/material-symbols-light/swap-horiz-rounded'
import IconSync from '~icons/material-symbols-light/sync-rounded'
import IconTimer from '~icons/material-symbols-light/timer-outline'
import { ModelTag, ProviderTile } from '../../components/AiBits'
import { Select } from '../../components/Select'
import { SettingsShell } from '../../components/SettingsShell'
import { Btn, Card, IconBtn, Notice, Segmented, Tag } from '../../components/ui'
import { price } from '../../lib/aiLook'
import { ApiError } from '../../lib/api'
import { when } from '../../lib/format'
import {
  kindName,
  type Provider,
  providerKinds,
  type Rotation,
  type RoutingStrategy,
  settingsFailure,
  strategyName,
  useModels,
  useProvider,
  useProviders,
  useRotation,
  useSettingsCommands,
} from '../../lib/settings'

/** Settings › Providers: the rotation LiteLLM applies, and each provider with its weight, fallback order and models. */
export function Providers() {
  const providers = useProviders()
  const rotation = useRotation()
  const commands = useSettingsCommands()
  const navigate = useNavigate()
  const list = providers.data?.items ?? []
  const [dragging, setDragging] = useState<string>()

  // A drop puts the dragged provider in the target's place: it takes the target's order.
  function drop(target: string) {
    const from = list.find((p) => p.id === dragging)
    const to = list.find((p) => p.id === target)
    setDragging(undefined)
    if (!from || !to || from === to || from.order === to.order) return
    commands.updateProvider.mutate({ id: from.id, order: to.order })
  }

  return (
    <SettingsShell
      title="Providers"
      icon={<IconCloud />}
      chips={[
        [<IconCloud key="c" width={16} height={16} />, list.length === 1 ? '1 provider' : `${list.length} providers`],
        ...(rotation.data ? ([[<IconSwap key="s" width={16} height={16} />, `Rotating ${(strategyName[rotation.data.routing_strategy] ?? rotation.data.routing_strategy).toLowerCase()}`]] as [ReactNode, ReactNode][]) : []),
      ]}
      actions={
        <Btn kind="primary" icon={<IconAdd width={17} height={17} />} onClick={() => navigate('/settings/providers/new')}>
          Add provider
        </Btn>
      }
    >
      {providers.error && <Notice>{settingsFailure(providers.error instanceof ApiError ? providers.error.code : undefined)}</Notice>}
      {rotation.data && <RotationCard r={rotation.data} providers={list} />}
      <div className="mb-3 mt-5 flex items-center gap-2 px-1">
        <p className="text-title-small">Providers</p>
        <span className="text-body-small text-on-surface-variant">Lower order is tried first; drag onto another to take its order</span>
      </div>
      <div className="rise-list space-y-3">
        {list.map((p, i) => (
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
                <Link to={`/settings/providers/${p.id}`} className="min-w-0 flex-1 leading-tight">
                  <p className="truncate text-title-medium hover:underline">{p.name}</p>
                  <p className="mt-0.5 truncate text-body-small text-on-surface-variant">
                    {kindName(p.kind)}
                    {p.key_hint ? ` · ` : ''}
                    <span className="tabular-nums">{p.key_hint}</span>
                  </p>
                </Link>
                <div className="w-[96px] leading-tight">
                  <p className="text-label-small font-normal text-on-surface-variant">Models</p>
                  <Link to={`/settings/providers/${p.id}`} className="mt-0.5 flex items-center gap-0.5 text-title-medium tabular-nums text-primary">
                    {p.models.length}
                    <IconChevron width={16} height={16} />
                  </Link>
                </div>
                <NumberField label="Weight" value={p.weight} onSave={(weight) => commands.updateProvider.mutate({ id: p.id, weight })} />
                <NumberField label="Order" value={p.order} min={1} onSave={(order) => commands.updateProvider.mutate({ id: p.id, order })} />
                <span className="w-[200px] text-right">
                  {p.mode === 'sync' ? (
                    <Tag tone="bg-secondary-container/70 text-on-secondary-container">
                      <IconSync width={14} height={14} />
                      {p.synced_at ? `Synced ${when(p.synced_at)}` : 'Kept in sync'}
                    </Tag>
                  ) : (
                    <Tag tone="bg-surface-container text-on-surface-variant">
                      <IconChecklist width={14} height={14} />
                      Picked models
                    </Tag>
                  )}
                </span>
              </div>
            </Card>
          </div>
        ))}
        {providers.data && list.length === 0 && <p className="px-1 text-body-medium text-on-surface-variant">No providers yet.</p>}
      </div>
    </SettingsShell>
  )
}

/** A number on a row, saved when the field loses focus. */
function NumberField({ label, value, onSave, min = 0 }: { label: string; value: number; onSave: (v: number) => void; min?: number }) {
  const [v, setV] = useState(String(value))
  return (
    <label className="w-[84px] leading-tight">
      <span className="block text-label-small font-normal text-on-surface-variant">{label}</span>
      <span className="mt-1 flex h-8 items-center rounded-lg border border-hairline bg-surface-container-lowest px-2.5 text-body-medium focus-within:border-primary/50">
        <input
          value={v}
          inputMode="numeric"
          onChange={(e) => setV(e.target.value.replace(/[^\d.]/g, '').slice(0, 5))}
          onBlur={() => {
            const n = Math.max(min, Number(v) || 0)
            if (n !== value) onSave(n)
            setV(String(n))
          }}
          className="w-full min-w-0 bg-transparent tabular-nums outline-none"
        />
      </span>
    </label>
  )
}

const strategies: { value: RoutingStrategy; label: string; icon: ReactNode }[] = [
  { value: 'simple-shuffle', label: strategyName['simple-shuffle'], icon: <IconBalance width={16} height={16} /> },
  { value: 'least-busy', label: strategyName['least-busy'], icon: <IconFallback width={16} height={16} /> },
  { value: 'latency-based-routing', label: strategyName['latency-based-routing'], icon: <IconSpeed width={16} height={16} /> },
  { value: 'usage-based-routing-v2', label: strategyName['usage-based-routing-v2'], icon: <IconBolt width={16} height={16} /> },
]

function RotationCard({ r, providers }: { r: Rotation; providers: Provider[] }) {
  const commands = useSettingsCommands()
  const first = providers.filter((p) => p.order === Math.min(...providers.map((x) => x.order)))
  return (
    <Card>
      <div className="flex flex-wrap items-start gap-6">
        <div className="min-w-0 flex-1">
          <h2 className="text-title-medium">Rotation</h2>
          <div className="mt-3">
            <Segmented
              label="Rotation"
              value={r.routing_strategy as RoutingStrategy}
              onChange={(routing_strategy) => commands.updateRotation.mutate({ routing_strategy })}
              items={strategies}
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
              {first.map((p) => (
                <ProviderTile key={p.id} name={p.name} index={providers.indexOf(p)} size={34} />
              ))}
            </span>
            <span className="whitespace-nowrap text-body-small text-on-surface-variant">first order, then the fallbacks</span>
          </div>
        </div>
        <div className="grid w-[440px] grid-cols-2 gap-3">
          <RotationNumber icon={<IconReplay width={15} height={15} />} label="Retries" unit="times" value={r.num_retries} onSave={(num_retries) => commands.updateRotation.mutate({ num_retries })} />
          <RotationNumber icon={<IconError width={15} height={15} />} label="Failures before a pause" unit="a minute" value={r.allowed_fails} onSave={(allowed_fails) => commands.updateRotation.mutate({ allowed_fails })} />
          <RotationNumber icon={<IconPause width={15} height={15} />} label="Pause a failing provider" unit="sec" value={r.cooldown_s} onSave={(cooldown_s) => commands.updateRotation.mutate({ cooldown_s })} />
          <RotationNumber icon={<IconTimer width={15} height={15} />} label="Timeout per try" unit="sec" value={r.timeout_s} onSave={(timeout_s) => commands.updateRotation.mutate({ timeout_s })} />
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
          onChange={(e) => setV(e.target.value.replace(/[^\d.]/g, '').slice(0, 5))}
          onBlur={() => Number(v) !== value && onSave(Number(v) || 0)}
          style={{ width: `${Math.max(1, v.length) + 0.5}ch` }}
          className="min-w-0 bg-transparent text-title-large tabular-nums outline-none"
        />
        <span className="text-body-small text-on-surface-variant">{unit}</span>
      </span>
    </label>
  )
}

/** One provider: its connection on the start side, its models and how they are kept on the end side. "new" adds one. */
export function ProviderPage() {
  const { id } = useParams()
  const isNew = id === 'new'
  const provider = useProvider(isNew ? undefined : id)
  if (!isNew && !provider.data) {
    return (
      <SettingsShell title="Provider" icon={<IconCloud />}>
        {(provider.error || provider.missing) && <Notice>{provider.missing ? 'There is no such provider.' : 'This provider did not load.'}</Notice>}
      </SettingsShell>
    )
  }
  return <ProviderForm key={provider.data?.id ?? 'new'} provider={provider.data} />
}

interface Draft {
  id: string
  name: string
  kind: string
  base_url: string
  api_key: string
  weight: number
  order: number
}

function ProviderForm({ provider }: { provider?: Provider }) {
  const navigate = useNavigate()
  const providers = useProviders()
  const commands = useSettingsCommands()
  const [draft, setDraft] = useState<Draft>(() =>
    provider
      ? { id: provider.id, name: provider.name, kind: provider.kind, base_url: provider.base_url ?? '', api_key: '', weight: provider.weight, order: provider.order }
      : { id: '', name: '', kind: 'openai', base_url: '', api_key: '', weight: 1, order: 1 },
  )
  const [changingKey, setChangingKey] = useState(!provider)
  const set = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }))
  const list = providers.data?.items ?? []
  const index = provider ? Math.max(0, list.findIndex((p) => p.id === provider.id)) : list.length
  const test = commands.testProvider
  const save = provider ? commands.updateProvider : commands.createProvider
  const idOk = /^[a-z0-9][a-z0-9-]{1,40}$/.test(draft.id)

  useEffect(() => {
    if (commands.createProvider.data) navigate(`/settings/providers/${commands.createProvider.data.id}`, { replace: true })
  }, [commands.createProvider.data, navigate])

  function submit() {
    if (provider) {
      commands.updateProvider.mutate(
        {
          id: provider.id,
          name: draft.name,
          base_url: draft.base_url || undefined,
          weight: draft.weight,
          order: draft.order,
          ...(changingKey && draft.api_key ? { api_key: draft.api_key } : {}),
        },
        { onSuccess: () => setChangingKey(false) },
      )
    } else {
      commands.createProvider.mutate({
        id: draft.id,
        name: draft.name || undefined,
        kind: draft.kind,
        base_url: draft.base_url || undefined,
        api_key: draft.api_key,
        weight: draft.weight,
        order: draft.order,
      })
    }
  }

  const input = 'h-11 w-full rounded-xl border border-hairline bg-surface-container-lowest px-3.5 text-body-medium outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 disabled:text-on-surface-variant'
  const label = 'mb-1.5 block text-body-small text-on-surface-variant'
  const kinds = { ...providerKinds, ...(draft.kind in providerKinds ? {} : { [draft.kind]: draft.kind }) }
  const ready = provider ? !!draft.name.trim() : idOk && !!draft.kind && !!draft.api_key

  return (
    <SettingsShell
      title={provider?.name ?? 'New provider'}
      icon={<IconCloud />}
      chips={
        provider
          ? [
              [<IconModel key="a" width={16} height={16} />, provider.models.length === 1 ? '1 model' : `${provider.models.length} models`],
              [<IconSwap key="b" width={16} height={16} />, `Weight ${provider.weight} · order ${provider.order}`],
            ]
          : undefined
      }
      actions={
        <>
          <Btn kind="ghost" icon={<IconBack width={17} height={17} />} onClick={() => navigate('/settings/providers')}>
            Providers
          </Btn>
          <Btn kind="primary" icon={<IconCheck width={17} height={17} />} onClick={submit} disabled={save.isPending || !ready}>
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
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[380px_1fr]">
        <Card>
          <h2 className="mb-4 text-title-medium">Connection</h2>
          <div className="space-y-3">
            {!provider && (
              <label className="block">
                <span className={label}>Id in LiteLLM</span>
                <input
                  value={draft.id}
                  onChange={(e) => set({ id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 41) })}
                  aria-invalid={!!draft.id && !idOk}
                  className={`${input} tabular-nums`}
                />
              </label>
            )}
            <label className="block">
              <span className={label}>Name</span>
              <input value={draft.name} onChange={(e) => set({ name: e.target.value })} maxLength={100} className={input} />
            </label>
            <div>
              <span className={label}>Type</span>
              <Select
                size="lg"
                label="Type"
                disabled={!!provider}
                value={draft.kind}
                onChange={(kind) => set({ kind })}
                leading={<ProviderTile name={draft.name || draft.id || '?'} index={index} size={22} />}
                options={Object.entries(kinds).map(([k, v]) => ({ value: k, label: v }))}
              />
            </div>
            <label className="block">
              <span className={label}>Base URL</span>
              <input value={draft.base_url} onChange={(e) => set({ base_url: e.target.value })} maxLength={500} className={input} />
            </label>
            <div>
              <span className={label}>API key</span>
              {changingKey ? (
                <input type="password" autoComplete="off" value={draft.api_key} onChange={(e) => set({ api_key: e.target.value })} className={input} />
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
                <input value={draft.weight} inputMode="numeric" onChange={(e) => set({ weight: Number(e.target.value.replace(/[^\d.]/g, '')) || 0 })} className={`${input} tabular-nums`} />
              </label>
              <label className="block">
                <span className={label}>Order</span>
                <input value={draft.order} inputMode="numeric" onChange={(e) => set({ order: Math.max(1, Number(e.target.value.replace(/\D/g, '')) || 1) })} className={`${input} tabular-nums`} />
              </label>
            </div>
          </div>
          {provider && (
            <div className={`mt-4 flex items-center gap-2 rounded-2xl px-3.5 py-3 text-body-small ${test.data && !test.data.ok ? 'bg-error-container text-error' : 'bg-primary/6 text-primary'}`}>
              {test.data && !test.data.ok ? <IconError width={18} height={18} /> : <IconCheckCircle width={18} height={18} />}
              <span className="min-w-0 flex-1">
                {test.isPending
                  ? 'Testing…'
                  : test.data
                    ? test.data.ok
                      ? `Connected · ${test.data.model ?? 'model'} · ${test.data.latency_ms} ms`
                      : (test.data.error ?? 'Did not connect')
                    : test.error
                      ? settingsFailure(test.error instanceof ApiError ? test.error.code : undefined)
                      : 'Calls one model once'}
              </span>
              <button type="button" onClick={() => test.mutate({ id: provider.id })} disabled={test.isPending || provider.models.length === 0} className="font-medium disabled:opacity-50">
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

/** A provider's models as deployments: added one by one by name, or kept in sync with the provider's list. */
function ProviderModelsCard({ provider }: { provider: Provider }) {
  const models = useModels()
  const commands = useSettingsCommands()
  const [name, setName] = useState('')
  const [costIn, setCostIn] = useState('')
  const [costOut, setCostOut] = useState('')
  const sync = provider.mode === 'sync'
  const info = (m: string) => models.data?.items.find((x) => x.model === m)
  const failure = commands.addProviderModel.error ?? commands.removeProviderModel.error
  function add() {
    const model = name.trim()
    if (!model) return
    commands.addProviderModel.mutate(
      {
        id: provider.id,
        model,
        ...(costIn ? { input_cost_per_mtok: Number(costIn) } : {}),
        ...(costOut ? { output_cost_per_mtok: Number(costOut) } : {}),
      },
      {
        onSuccess: () => {
          setName('')
          setCostIn('')
          setCostOut('')
        },
      },
    )
  }
  const small = 'h-10 rounded-xl border border-hairline bg-surface-container-lowest px-3 text-body-medium outline-none focus:border-primary/50'
  return (
    <div>
      <div className="mb-3 flex items-center gap-3 px-1">
        <p className="text-title-small">{provider.name}'s models</p>
        <Tag tone="bg-surface-container text-on-surface-variant">{provider.models.length}</Tag>
        {sync && provider.synced_at && <span className="text-body-small text-on-surface-variant">Synced {when(provider.synced_at)}</span>}
        <span className="flex-1" />
        <Segmented
          label="How models are kept"
          value={provider.mode}
          onChange={(mode) => commands.updateProvider.mutate({ id: provider.id, mode })}
          items={[
            { value: 'pick', label: 'Pick models', icon: <IconChecklist width={16} height={16} /> },
            { value: 'sync', label: 'All, kept in sync', icon: <IconSync width={16} height={16} /> },
          ]}
        />
      </div>
      {failure && (
        <div className="mb-3">
          <Notice>{settingsFailure(failure instanceof ApiError ? failure.code : undefined)}</Notice>
        </div>
      )}
      <Card className="overflow-hidden p-0">
        {provider.models.map((m) => {
          const x = info(m)
          return (
            <div key={m} className="flex items-center gap-4 border-t border-hairline px-5 py-3 first:border-t-0 hover:bg-on-surface/3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
                <IconModel width={18} height={18} />
              </span>
              <span className="w-[240px] min-w-0 truncate text-title-small">{m}</span>
              <span className="flex min-w-0 flex-1 flex-wrap gap-1">
                {x?.tags.map((t) => (
                  <ModelTag key={t} name={t} small />
                ))}
                {x && x.tags.length === 0 && <span className="text-body-small text-error">No tags yet</span>}
              </span>
              <span className="w-[90px] tabular-nums text-body-small">{price(x?.input_cost_per_mtok, x?.output_cost_per_mtok)}</span>
              {!sync && (
                <IconBtn title={`Remove from ${provider.name}`} className="hover:text-error" onClick={() => commands.removeProviderModel.mutate({ id: provider.id, model: m })}>
                  <IconClose width={18} height={18} />
                </IconBtn>
              )}
            </div>
          )
        })}
        {provider.models.length === 0 && <p className="px-5 py-5 text-body-medium text-on-surface-variant">No models added.</p>}
      </Card>
      {!sync && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            add()
          }}
          className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/3 p-2.5"
        >
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Model as the provider names it" maxLength={200} className={`${small} min-w-[220px] flex-1`} />
          <input value={costIn} inputMode="decimal" onChange={(e) => setCostIn(e.target.value.replace(/[^\d.]/g, ''))} placeholder="$ in / 1M" className={`${small} w-[110px] tabular-nums`} />
          <input value={costOut} inputMode="decimal" onChange={(e) => setCostOut(e.target.value.replace(/[^\d.]/g, ''))} placeholder="$ out / 1M" className={`${small} w-[110px] tabular-nums`} />
          <Btn type="submit" kind="primary" icon={<IconAdd width={17} height={17} />} disabled={!name.trim() || commands.addProviderModel.isPending}>
            Add model
          </Btn>
        </form>
      )}
    </div>
  )
}
