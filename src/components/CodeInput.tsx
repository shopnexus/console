import { useRef, useState } from 'react'

type Props = {
  value: string
  onChange: (code: string) => void
  onComplete?: (code: string) => void
  error?: boolean
  autoFocus?: boolean
  label: string
}

/**
 * Six code boxes in two groups of three. One real input sits over them, so
 * pasting, autofill from the authenticator and screen readers all see a
 * single field.
 */
export function CodeInput({ value, onChange, onComplete, error, autoFocus, label }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState(false)
  const boxes = Array.from({ length: 6 }, (_, i) => {
    const digit = value[i] ?? ''
    const current = focused && i === Math.min(value.length, 5)
    const border = error
      ? 'border-2 border-error'
      : current
        ? 'border-2 border-primary bg-surface-container-lowest'
        : digit
          ? 'border border-outline bg-surface-container-lowest'
          : 'border border-outline-variant bg-surface-container-low'
    return (
      <div key={i} className={`flex h-16 w-14 items-center justify-center rounded-md ${border}`}>
        {digit ? (
          <span className="font-mono text-title-large text-on-surface">{digit}</span>
        ) : current ? (
          <span className="h-7 w-0.5 animate-pulse bg-primary" />
        ) : null}
      </div>
    )
  })
  return (
    <div className="relative w-fit" onClick={() => input.current?.focus()}>
      <div className="flex items-center gap-2" aria-hidden>
        {boxes.slice(0, 3)}
        <span className="mx-1 h-0.5 w-3 rounded-full bg-outline-variant" />
        {boxes.slice(3)}
      </div>
      <input
        ref={input}
        aria-label={label}
        value={value}
        autoFocus={autoFocus}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          const code = e.target.value.replace(/\D/g, '').slice(0, 6)
          onChange(code)
          if (code.length === 6) onComplete?.(code)
        }}
        className="absolute inset-0 h-full w-full cursor-text opacity-0"
      />
    </div>
  )
}
