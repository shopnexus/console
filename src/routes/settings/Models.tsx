import { type ReactNode, useCallback, useState } from 'react'
import IconAdd from '~icons/material-symbols-light/add-rounded'
import IconApps from '~icons/material-symbols-light/apps-rounded'
import IconChat from '~icons/material-symbols-light/chat-outline-rounded'
import IconHub from '~icons/material-symbols-light/hub-outline-rounded'
import IconModel from '~icons/material-symbols-light/neurology-outline-rounded'
import IconSearch from '~icons/material-symbols-light/search-rounded'
import IconSell from '~icons/material-symbols-light/sell-outline-rounded'
import IconSync from '~icons/material-symbols-light/sync-rounded'
import { ModelTag, ProviderTile, TagIcon } from '../../components/AiBits'
import { SettingsShell } from '../../components/SettingsShell'
import { Card, Check, Notice, Segmented } from '../../components/ui'
import { contextSize, fillAt, price } from '../../lib/aiLook'
import { useDismiss } from '../../lib/dom'
import { time } from '../../lib/format'
import { type AiModel, type ModelTag as Tag, useAgents, useModels, useProviders, useSettingsCommands } from '../../lib/settings'

type Kind = 'all' | 'Chat' | 'Embedding'

/** Settings › Models: every model the providers serve, synced from them, with its tags, providers, price and the agents using it. */
export function Models() {
  const models = useModels()
  const providers = useProviders()
  const agents = useAgents()
  const [kind, setKind] = useState<Kind>('all')
  const [caps, setCaps] = useState<string[]>([])
  const [q, setQ] = useState('')
  const items = models.data?.items ?? []
  const tags = models.data?.tags ?? []
  const capabilities = tags.filter((t) => t.kind === 'capability')
  const needle = q.trim().toLowerCase()
  const rows = items.filter(
    (m) => (kind === 'all' || m.tags.includes(kind)) && caps.every((c) => m.tags.includes(c)) && (!needle || m.model.toLowerCase().includes(needle)),
  )
  const plist = providers.data?.items ?? []
  const alist = agents.data?.items ?? []

  return (
    <SettingsShell
      title="Models"
      icon={<IconModel />}
      chips={[
        ...(models.data?.synced_at
          ? ([[<IconSync key="s" width={16} height={16} />, `Synced from ${plist.length} providers · ${time(models.data.synced_at)}`]] as [ReactNode, ReactNode][])
          : []),
        [<IconModel key="m" width={16} height={16} />, `${items.length} models`],
        [<IconSell key="t" width={16} height={16} />, `${tags.filter((t) => t.kind === 'type').length} types · ${capabilities.length} capabilities`],
      ]}
    >
      {models.error && <Notice>Models did not load.</Notice>}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Segmented
          label="Type"
          value={kind}
          onChange={setKind}
          items={[
            { value: 'all', label: `All · ${items.length}`, icon: <IconApps width={16} height={16} /> },
            { value: 'Chat', label: `Chat · ${items.filter((m) => m.tags.includes('Chat')).length}`, icon: <IconChat width={16} height={16} /> },
            { value: 'Embedding', label: `Embedding · ${items.filter((m) => m.tags.includes('Embedding')).length}`, icon: <IconHub width={16} height={16} /> },
          ]}
        />
        <span className="mx-1 h-6 w-px bg-outline-variant/60" />
        {capabilities.map((t) => {
          const on = caps.includes(t.name)
          return (
            <button
              key={t.name}
              type="button"
              aria-pressed={on}
              onClick={() => setCaps((c) => (on ? c.filter((x) => x !== t.name) : [...c, t.name]))}
              className={`flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-label-medium font-normal ${
                on ? 'border-primary/40 bg-primary/6 text-primary' : 'border-hairline bg-surface-container-lowest text-on-surface-variant'
              }`}
            >
              <TagIcon name={t.name} />
              {t.name}
              <span className="tabular-nums text-label-small opacity-70">{items.filter((m) => m.tags.includes(t.name)).length}</span>
            </button>
          )
        })}
        <span className="flex-1" />
        <label className="flex h-10 w-[240px] items-center gap-2 rounded-full border border-hairline bg-surface-container-lowest px-4 text-on-surface-variant focus-within:border-primary/40">
          <IconSearch width={18} height={18} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search models"
            aria-label="Search models"
            className="h-full min-w-0 flex-1 bg-transparent text-body-medium text-on-surface outline-none placeholder:text-on-surface-variant"
          />
        </label>
      </div>
      <Card className="overflow-hidden p-0">
        <div className="flex items-center gap-5 border-b border-hairline bg-surface-container-low/60 px-5 py-3 text-body-small text-on-surface-variant">
          <span className="w-[230px]">Model</span>
          <span className="w-[330px]">Tags</span>
          <span className="w-[120px]">Providers</span>
          <span className="w-[100px]">Per 1M tokens</span>
          <span className="flex-1">Used by</span>
        </div>
        <div className="rise-list">
          {rows.map((m) => {
            const vec = m.tags.includes('Embedding')
            return (
              <div key={m.model} className="flex items-center gap-5 border-t border-hairline px-5 py-3.5 first:border-t-0 hover:bg-on-surface/3">
                <span className="flex w-[230px] items-center gap-3">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${vec ? 'bg-surface-container text-on-surface-variant' : 'bg-primary/8 text-primary'}`}
                  >
                    {vec ? <IconHub width={20} height={20} /> : <IconModel width={20} height={20} />}
                  </span>
                  <span className="min-w-0 leading-tight">
                    <span className="block truncate text-title-small">{m.model}</span>
                    <span className="block text-body-small text-on-surface-variant">
                      {m.family ? `${m.family} · ` : ''}
                      <span className="tabular-nums">{contextSize(m.context_tokens)}</span> context
                    </span>
                  </span>
                </span>
                <span className="flex w-[330px] flex-wrap items-center gap-1.5">
                  {m.tags.map((t) => (
                    <ModelTag key={t} name={t} small />
                  ))}
                  <TagEditor m={m} tags={tags} />
                </span>
                <span className="flex w-[120px] -space-x-1.5">
                  {m.providers.map((id) => {
                    const i = plist.findIndex((p) => p.id === id)
                    return i >= 0 ? <ProviderTile key={id} name={plist[i].name} index={i} size={26} /> : null
                  })}
                </span>
                <span className="w-[100px] tabular-nums text-body-small">{price(m.price_in_usd, m.price_out_usd)}</span>
                <span className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                  {m.used_by.length === 0 && <span className="text-body-small text-on-surface-variant">Unused</span>}
                  {m.used_by.map((id) => {
                    const i = alist.findIndex((a) => a.id === id)
                    return (
                      <span key={id} className="inline-flex h-6 items-center gap-1.5 rounded-full border border-hairline bg-surface-container-lowest px-2 text-label-small font-normal">
                        <span className={`h-2 w-2 rounded-full ${fillAt(i)}`} />
                        {alist[i]?.name ?? id}
                      </span>
                    )
                  })}
                </span>
              </div>
            )
          })}
          {models.data && rows.length === 0 && <p className="px-5 py-6 text-body-medium text-on-surface-variant">No model matches.</p>}
        </div>
      </Card>
    </SettingsShell>
  )
}

/** The + after a model's tags: tick the tags it carries. */
function TagEditor({ m, tags }: { m: AiModel; tags: Tag[] }) {
  const commands = useSettingsCommands()
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const ref = useDismiss<HTMLDivElement>(open, close)
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        title="Tags"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-outline-variant text-on-surface-variant hover:bg-surface-container-low"
      >
        <IconAdd width={14} height={14} />
      </button>
      {open && (
        <div className="absolute left-0 top-8 z-20 w-[240px] animate-pop rounded-3xl border border-hairline bg-surface-container-lowest p-1.5 shadow-float">
          {[...tags]
            .sort((a, b) => a.sort - b.sort)
            .map((t) => {
              const on = m.tags.includes(t.name)
              return (
                <button
                  key={t.name}
                  type="button"
                  disabled={commands.setModelTags.isPending}
                  onClick={() => commands.setModelTags.mutate({ model: m.model, tags: on ? m.tags.filter((x) => x !== t.name) : [...m.tags, t.name] })}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-surface-container-low"
                >
                  <Check on={on} />
                  <ModelTag name={t.name} small />
                </button>
              )
            })}
        </div>
      )}
    </div>
  )
}
