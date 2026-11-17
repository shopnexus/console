import type { ButtonHTMLAttributes, ReactNode } from 'react'
import IconCheck from '~icons/material-symbols/check-rounded'
import IconComputer from '~icons/material-symbols-light/computer-outline-rounded'
import IconDark from '~icons/material-symbols-light/dark-mode-outline-rounded'
import IconLight from '~icons/material-symbols-light/light-mode-outline-rounded'
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
  ['system', 'Theo hệ thống', <IconComputer key="s" width={16} height={16} />],
  ['light', 'Sáng', <IconLight key="l" width={16} height={16} />],
  ['dark', 'Tối', <IconDark key="d" width={16} height={16} />],
]

/** System, light or dark, as in the app's Tôi: a segmented control. */
export function ThemeSwitch() {
  const [choice, setChoice] = useTheme()
  return (
    <div role="radiogroup" aria-label="Giao diện" className="flex h-8 rounded-sm bg-surface-container p-0.5">
      {themes.map(([value, label, icon]) => (
        <button
          key={value}
          role="radio"
          aria-checked={choice === value}
          title={label}
          onClick={() => setChoice(value)}
          className={`flex flex-1 items-center justify-center rounded-xs px-2.5 ${
            choice === value ? 'bg-surface-container-lowest text-on-surface shadow-lift' : 'text-on-surface-variant hover:text-on-surface'
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
      <span className="h-px flex-1 bg-hairline" />
      {step(2, 'Bật xác thực hai bước')}
    </div>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-xs border border-hairline bg-surface-container-lowest px-1 font-mono text-label-small text-on-surface-variant">
      {children}
    </kbd>
  )
}

/** A refusal or a lock, in the error colours. */
export function Notice({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-lg bg-error-container px-3 py-2.5 text-body-medium text-error">
      {children}
    </p>
  )
}
