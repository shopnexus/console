import { type InputHTMLAttributes, type ReactNode, useId, useState } from 'react'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> & {
  label: string
  trailing?: ReactNode
  error?: boolean
}

/** M3 outlined text field, 56 px, with the label on the border once it has a value or focus. */
export function Field({ label, trailing, error, value, onFocus, onBlur, ...input }: Props) {
  const id = useId()
  const [focused, setFocused] = useState(false)
  const raised = focused || String(value ?? '') !== ''
  const border = error ? 'border-2 border-error' : focused ? 'border-2 border-primary' : 'border border-outline'
  const labelColor = error ? 'text-error' : focused ? 'text-primary' : 'text-on-surface-variant'
  return (
    <div className={`relative flex h-14 items-center gap-1 rounded-xs pl-4 pr-1 ${border}`}>
      <label
        htmlFor={id}
        className={`pointer-events-none absolute left-3 bg-surface px-1 transition-all duration-(--duration-effects-fast) ease-effects ${labelColor} ${
          raised ? '-top-2.5 text-body-small' : 'top-1/2 -translate-y-1/2 text-body-large'
        }`}
      >
        {label}
      </label>
      <input
        id={id}
        value={value}
        onFocus={(e) => {
          setFocused(true)
          onFocus?.(e)
        }}
        onBlur={(e) => {
          setFocused(false)
          onBlur?.(e)
        }}
        className="h-full min-w-0 flex-1 bg-transparent text-body-large text-on-surface outline-none"
        {...input}
      />
      {trailing}
    </div>
  )
}
