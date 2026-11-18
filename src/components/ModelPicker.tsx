import { useState } from 'react'
import IconFilter from '~icons/material-symbols-light/filter-alt-outline'
import IconHidden from '~icons/material-symbols-light/visibility-off-outline'
import IconModel from '~icons/material-symbols-light/neurology-outline-rounded'
import { price } from '../lib/aiLook'
import { type AiModel, modelsFor, type Provider } from '../lib/settings'
import { ModelTag, ProviderTile } from './AiBits'
import { Select } from './Select'

/**
 * An agent's model, on the searchable Select: the models carrying every
 * required tag. The ones missing a tag are counted and shown on request,
 * but cannot be picked.
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
  const [showAll, setShowAll] = useState(false)
  const { fit, hidden } = modelsFor(models, required)
  const tiles = (list: { id: string; name: string }[]) => (
    <span className="flex -space-x-1.5">
      {list.map((n) => (
        <ProviderTile key={n.id} name={n.name} index={Math.max(0, providers.findIndex((p) => p.id === n.id))} size={22} />
      ))}
    </span>
  )
  return (
    <Select
      searchable
      size="lg"
      label="Model"
      placeholder="Pick a model"
      value={value || undefined}
      onChange={onChange}
      className="h-12"
      leading={<IconModel width={20} height={20} className="text-primary" />}
      options={(showAll ? models : fit).map((m) => ({
        value: m.model,
        text: m.model,
        disabled: !fit.includes(m),
        icon: (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
            <IconModel width={18} height={18} />
          </span>
        ),
        label: (
          <span className="flex items-center gap-2">
            <span className="flex-1 truncate font-medium">{m.model}</span>
            {tiles(m.providers)}
          </span>
        ),
        hint: (
          <span className="flex flex-wrap items-center gap-1 whitespace-normal pt-0.5">
            <span className="mr-1 tabular-nums">{price(m.input_cost_per_mtok, m.output_cost_per_mtok)}</span>
            {m.tags.map((t) => (
              <ModelTag key={t} name={t} small />
            ))}
          </span>
        ),
      }))}
      footer={
        <>
          {required.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 border-t border-hairline px-2.5 pt-2 text-body-small text-on-surface-variant">
              <IconFilter width={15} height={15} />
              Has all
              {required.map((t) => (
                <ModelTag key={t} name={t} small />
              ))}
            </div>
          )}
          {hidden > 0 && (
            <div className="flex items-center gap-2 px-2.5 pb-1 pt-2 text-body-small text-on-surface-variant">
              <IconHidden width={15} height={15} />
              {showAll ? `${hidden} without these tags shown` : `${hidden} models without these tags hidden`}
              <span className="flex-1" />
              <button type="button" onClick={() => setShowAll((s) => !s)} className="font-medium text-primary">
                {showAll ? 'Hide' : 'Show'}
              </button>
            </div>
          )}
        </>
      }
    />
  )
}
