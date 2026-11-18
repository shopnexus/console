import { useCallback, useState } from 'react'
import IconCheck from '~icons/material-symbols-light/check-rounded'
import IconExpand from '~icons/material-symbols-light/expand-more-rounded'
import IconLess from '~icons/material-symbols-light/expand-less-rounded'
import IconFilter from '~icons/material-symbols-light/filter-alt-outline'
import IconModel from '~icons/material-symbols-light/neurology-outline-rounded'
import IconHidden from '~icons/material-symbols-light/visibility-off-outline'
import IconSearch from '~icons/material-symbols-light/search-rounded'
import { price } from '../lib/aiLook'
import { useDismiss } from '../lib/dom'
import { type AiModel, modelsFor, type Provider } from '../lib/settings'
import { ModelTag, ProviderTile } from './AiBits'

/**
 * An agent's model: the models carrying every required tag, with search.
 * The ones missing a tag are counted and shown on request, but cannot be
 * picked.
 */
export function ModelPicker({
  models,
  providers,
  required,
  value,
  onChange,
}: {
  models: AiModel[]
  providers: Provider[]
  required: string[]
  value: string
  onChange: (model: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [showAll, setShowAll] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const ref = useDismiss<HTMLDivElement>(open, close)
  const { fit, hidden } = modelsFor(models, required)
  const needle = q.trim().toLowerCase()
  const shown = (showAll ? models : fit).filter((m) => !needle || m.model.toLowerCase().includes(needle))
  const current = models.find((m) => m.model === value)
  const tiles = (ids: string[], size: number) => (
    <span className="flex -space-x-1.5">
      {ids.map((id) => {
        const i = providers.findIndex((p) => p.id === id)
        return i >= 0 ? <ProviderTile key={id} name={providers[i].name} index={i} size={size} /> : null
      })}
    </span>
  )

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`flex h-12 w-full items-center gap-3 rounded-2xl border-2 bg-surface-container-lowest px-3.5 text-left ${
          open ? 'border-primary/50 ring-4 ring-primary/10' : 'border-hairline'
        }`}
      >
        <IconModel width={20} height={20} className="text-primary" />
        <span className="flex-1 truncate text-title-small">{value || 'Pick a model'}</span>
        {current && tiles(current.providers, 22)}
        {open ? <IconLess width={20} height={20} className="text-on-surface-variant" /> : <IconExpand width={20} height={20} className="text-on-surface-variant" />}
      </button>
      {open && (
        <div className="absolute inset-x-0 top-[56px] z-20 animate-pop rounded-4xl border border-hairline bg-surface-container-lowest p-2 shadow-float">
          <label className="flex h-10 items-center gap-2 rounded-xl bg-surface-container-low px-3 text-on-surface-variant">
            <IconSearch width={18} height={18} />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search models"
              aria-label="Search models"
              className="h-full min-w-0 flex-1 bg-transparent text-body-medium text-on-surface outline-none placeholder:text-on-surface-variant"
            />
          </label>
          {required.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 px-2.5 pb-2 pt-2.5 text-body-small text-on-surface-variant">
              <IconFilter width={15} height={15} />
              Has all
              {required.map((t) => (
                <ModelTag key={t} name={t} small />
              ))}
            </div>
          )}
          <div className="max-h-[320px] overflow-y-auto">
            {shown.map((m) => {
              const ok = fit.includes(m)
              const on = m.model === value
              return (
                <button
                  key={m.model}
                  type="button"
                  disabled={!ok}
                  onClick={() => {
                    onChange(m.model)
                    close()
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left disabled:opacity-45 ${on ? 'bg-primary/6' : 'hover:bg-surface-container-low'}`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
                    <IconModel width={18} height={18} />
                  </span>
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="flex items-center gap-2">
                      <span className="text-title-small">{m.model}</span>
                      <span className="tabular-nums text-label-small font-normal text-on-surface-variant">{price(m.price_in_usd, m.price_out_usd)}</span>
                    </span>
                    <span className="mt-1 flex flex-wrap gap-1">
                      {m.tags.map((t) => (
                        <ModelTag key={t} name={t} small />
                      ))}
                    </span>
                  </span>
                  {tiles(m.providers, 22)}
                  <span className="w-5">{on && <IconCheck width={18} height={18} className="text-primary" />}</span>
                </button>
              )
            })}
            {shown.length === 0 && <p className="px-3 py-3 text-body-medium text-on-surface-variant">No model matches.</p>}
          </div>
          {hidden > 0 && (
            <div className="mt-1 flex items-center gap-2 border-t border-hairline px-3 pb-1 pt-2.5 text-body-small text-on-surface-variant">
              <IconHidden width={15} height={15} />
              {showAll ? `${hidden} without these tags shown` : `${hidden} models without these tags hidden`}
              <span className="flex-1" />
              <button type="button" onClick={() => setShowAll((s) => !s)} className="font-medium text-primary">
                {showAll ? 'Hide' : 'Show'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
