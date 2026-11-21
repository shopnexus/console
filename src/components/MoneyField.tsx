import { useNumberDraft } from '../lib/draft'

/** A dollar amount saved when the field loses focus; empty takes the budget away. */
export function MoneyField({
  value,
  label,
  onSave,
  big = false,
  suffix,
  placeholder = 'None',
  className = 'w-[130px]',
}: {
  value?: number
  label: string
  onSave: (v: number | undefined) => void
  big?: boolean
  suffix?: string
  placeholder?: string
  className?: string
}) {
  const draft = useNumberDraft(value, onSave, { digits: 8 })
  return (
    <label className={`flex items-baseline rounded-xl ${big ? 'mt-1 text-headline-medium' : `h-10 ${className} shrink-0 border border-hairline bg-surface-container-lowest px-3 text-body-medium focus-within:border-primary/50`}`}>
      <span className={big ? '' : 'text-on-surface-variant'}>$</span>
      <input
        {...draft}
        aria-label={label}
        placeholder={placeholder}
        inputMode="decimal"
        className="h-full w-full min-w-0 bg-transparent tabular-nums outline-none placeholder:text-on-surface-variant"
      />
      {suffix && <span className="text-body-small text-on-surface-variant">{suffix}</span>}
    </label>
  )
}
