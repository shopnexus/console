import type { ButtonHTMLAttributes, ReactNode } from 'react'
import IconCheck from '~icons/material-symbols/check-rounded'
import IconComputer from '~icons/material-symbols/computer-outline-rounded'
import IconDark from '~icons/material-symbols/dark-mode-outline-rounded'
import IconLight from '~icons/material-symbols/light-mode-outline-rounded'
import { type ShapeName, shapes } from '../lib/shapes'
import { type ThemeChoice, useTheme } from '../lib/theme'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  kind?: 'filled' | 'text'
  full?: boolean
  icon?: ReactNode
}

/** M3 pill button, 48 px; filled is the one main action of a view. */
export function Button({ kind = 'filled', full, icon, children, className = '', ...rest }: ButtonProps) {
  const look = kind === 'filled' ? 'bg-primary text-on-primary disabled:opacity-60' : 'text-primary'
  return (
    <button
      {...rest}
      className={`state-layer inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-label-large ${look} ${
        full ? 'w-full' : ''
      } ${className}`}
    >
      {children}
      {icon}
    </button>
  )
}

/** An M3 Expressive shape, for decoration. */
export function Shape({ name, size, className = '' }: { name: ShapeName; size: number; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden>
      <path d={shapes[name]} fill="currentColor" />
    </svg>
  )
}

const themes: [ThemeChoice, string, ReactNode][] = [
  ['system', 'Theo hệ thống', <IconComputer key="s" width={18} height={18} />],
  ['light', 'Sáng', <IconLight key="l" width={18} height={18} />],
  ['dark', 'Tối', <IconDark key="d" width={18} height={18} />],
]

/** System, light or dark, as in the app's Tôi. */
export function ThemeSwitch() {
  const [choice, setChoice] = useTheme()
  return (
    <div role="radiogroup" aria-label="Giao diện" className="flex items-center gap-1 rounded-full border border-outline-variant p-1">
      {themes.map(([value, label, icon]) => (
        <button
          key={value}
          role="radio"
          aria-checked={choice === value}
          title={label}
          onClick={() => setChoice(value)}
          className={`state-layer flex h-8 w-10 items-center justify-center rounded-full ${
            choice === value ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant'
          }`}
        >
          {icon}
        </button>
      ))}
    </div>
  )
}

/** The first sign-in's two steps. */
export function Steps({ active }: { active: 1 | 2 }) {
  const step = (n: 1 | 2, text: string) => {
    const done = n < active
    const now = n === active
    return (
      <div className="flex items-center gap-2">
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-full text-label-medium ${
            done || now ? 'bg-primary text-on-primary' : 'border border-outline text-on-surface-variant'
          }`}
        >
          {done ? <IconCheck width={16} height={16} /> : n}
        </span>
        <span className={`text-label-large ${done || now ? 'text-on-surface' : 'text-on-surface-variant'}`}>{text}</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-3">
      {step(1, 'Đặt mật khẩu mới')}
      <span className="h-px flex-1 bg-outline-variant" />
      {step(2, 'Bật xác thực hai bước')}
    </div>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded-xs border border-outline-variant bg-surface-container-lowest px-1.5 font-mono text-label-small text-on-surface-variant">
      {children}
    </kbd>
  )
}

/** A refusal or a lock, in the error colours. */
export function Notice({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-sm bg-error-container px-4 py-3 text-body-medium text-error">
      {children}
    </p>
  )
}
