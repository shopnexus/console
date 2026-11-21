import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from 'react'
import { flushSync } from 'react-dom'
import IconCheck from '~icons/material-symbols/check-rounded'
import IconComputer from '~icons/material-symbols-light/computer-outline-rounded'
import IconDark from '~icons/material-symbols-light/dark-mode-outline-rounded'
import IconLight from '~icons/material-symbols-light/light-mode-outline-rounded'
import type { PersonStatus } from '../lib/commerce'
import { segment, tintOf } from '../lib/look'
import { type ThemeChoice, useTheme } from '../lib/theme'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  kind?: 'filled' | 'text'
  full?: boolean
  icon?: ReactNode
}

/** The 48 px pill of sign-in and the handoff; filled is the one main action of a view. */
export function Button({ kind = 'filled', full, icon, children, className = '', ...rest }: ButtonProps) {
  const look = kind === 'filled' ? 'bg-primary text-on-primary disabled:opacity-50' : 'text-primary'
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

export type BtnKind = 'primary' | 'plain' | 'ghost' | 'danger' | 'danger-fill' | 'dark'

const btnLook: Record<BtnKind, string> = {
  primary: 'bg-primary text-on-primary',
  plain: 'border border-hairline bg-surface-container-lowest hover:bg-surface-container-low',
  ghost: 'text-primary hover:bg-surface-container-low',
  // A destructive action on the page is a neutral outline; only the confirm inside its popover is danger-fill.
  danger: 'border border-hairline text-on-surface hover:bg-on-surface/5',
  'danger-fill': 'bg-error text-on-error',
  dark: 'bg-on-surface text-surface',
}

/**
 * The soft look's button: a 36 px pill (40 with big). primary is the one
 * main action of a view; danger-fill takes a right away from someone.
 */
export function Btn({
  kind = 'plain',
  big = false,
  icon,
  children,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { kind?: BtnKind; big?: boolean; icon?: ReactNode }) {
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full text-label-medium disabled:opacity-50 ${
        big ? 'h-10 px-4' : 'h-9 px-4'
      } ${btnLook[kind]} ${className}`}
    >
      {icon}
      {children}
    </button>
  )
}

/** A round 32 px icon button with its name as the title. */
export function IconBtn({
  title,
  children,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { title: string }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      {...rest}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-low disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  )
}

/** A 24 px pill for a status, a role or a count. */
export function Tag({ children, tone = 'bg-primary/8 text-primary', className = '' }: { children: ReactNode; tone?: string; className?: string }) {
  return (
    <span className={`inline-flex h-6 shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 text-label-small ${tone} ${className}`}>
      {children}
    </span>
  )
}

/** A status dot inside a Tag. */
export function Dot({ tone = 'bg-primary' }: { tone?: string }) {
  return <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone}`} />
}

/** An on/off switch, 44 × 24. */
export function Toggle({ on, onChange, label, disabled }: { on: boolean; onChange?: (on: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      title={label}
      disabled={disabled || !onChange}
      onClick={() => onChange?.(!on)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-default ${
        on ? 'bg-primary' : 'bg-surface-container-highest'
      }`}
    >
      <span
        className={`absolute h-5 w-5 rounded-full bg-white shadow-lift transition-[left] duration-(--duration-spatial-fast) ease-spatial-fast ${on ? 'left-[22px]' : 'left-0.5'}`}
      />
    </button>
  )
}

/** A bar for a share of a whole, 0 to 100. It draws still, then moves by translate (280 ms) when the share changes. */
export function Meter({ pct, tone = 'bg-primary', className = 'h-2' }: { pct: number; tone?: string; className?: string }) {
  const p = Math.max(0, Math.min(100, pct))
  return (
    <div className={`w-full overflow-hidden rounded-full bg-surface-container ${className}`}>
      <div
        className={`h-full w-full rounded-full transition-transform duration-[280ms] ease-effects ${tone}`}
        style={{ transform: `translateX(${p - 100}%)` }}
      />
    </div>
  )
}

/** A white card on the page with the soft shadow and 16 px corners. */
export function Card({ children, className = 'p-5' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-3xl border border-hairline bg-surface-container-lowest shadow-soft ${className}`}>{children}</section>
}

export function CardHead({ title, sub, right }: { title: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <h2 className="text-title-medium">{title}</h2>
        {sub && <p className="mt-0.5 text-body-small text-on-surface-variant">{sub}</p>}
      </div>
      {right}
    </div>
  )
}

/** A 32 to 56 px tinted tile holding an icon. */
export function IconTile({ children, tone = 'bg-primary/8 text-primary', size = 36, round = false }: { children: ReactNode; tone?: string; size?: number; round?: boolean }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center ${round ? 'rounded-full' : size >= 44 ? 'rounded-2xl' : 'rounded-lg'} ${tone}`}
      style={{ width: size, height: size }}
    >
      {children}
    </span>
  )
}

/** A destructive step asked first: what happens, Cancel and the confirm button. */
export function Confirm({
  title,
  children,
  error,
  confirm,
  busy,
  onConfirm,
  onCancel,
  className = '',
}: {
  title: ReactNode
  children: ReactNode
  error?: ReactNode
  confirm: string
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
  className?: string
}) {
  return (
    <div className={`animate-rise ${className}`}>
      <p className="text-title-small">{title}</p>
      <p className="mt-1 text-body-small text-on-surface-variant">{children}</p>
      {error && <p className="mt-2 text-body-small text-error">{error}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <Btn onClick={onCancel}>Cancel</Btn>
        <Btn kind="danger-fill" disabled={busy} onClick={onConfirm}>
          {confirm}
        </Btn>
      </div>
    </div>
  )
}

/** A pill segmented control; the picked segment is the white thumb. */
export function Segmented<T extends string>({
  items,
  value,
  onChange,
  label,
  full = false,
}: {
  items: { value: T; label: ReactNode; icon?: ReactNode }[]
  value: T
  onChange: (v: T) => void
  label: string
  full?: boolean
}) {
  return (
    <div role="tablist" aria-label={label} className={`flex rounded-full bg-surface-container p-1 text-label-medium ${full ? 'w-full' : 'w-fit'}`}>
      {items.map((it) => (
        <button
          key={it.value}
          type="button"
          role="tab"
          aria-selected={it.value === value}
          onClick={() => onChange(it.value)}
          className={`flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3.5 ${full ? 'flex-1' : ''} ${segment(it.value === value)}`}
        >
          {it.icon}
          {it.label}
        </button>
      ))}
    </div>
  )
}

/** A sparkline of a short series, with its last point marked. */
export function Spark({ values, w = 110, h = 34, tone = 'text-primary' }: { values: number[]; w?: number; h?: number; tone?: string }) {
  if (values.length < 2) return null
  const top = Math.max(...values)
  const low = Math.min(...values)
  const span = top - low || 1
  const pts = values.map((v, i) => [(i * w) / (values.length - 1), h - 3 - ((v - low) / span) * (h - 6)] as const)
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const [lx, ly] = pts[pts.length - 1]
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className={`block shrink-0 ${tone}`} aria-hidden>
      <polygon points={`0,${h} ${line} ${w},${h}`} fill="currentColor" opacity={0.1} />
      <polyline points={line} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r={3} fill="currentColor" />
    </svg>
  )
}

/** A ring split into parts that add up to at most 100, with text in the middle. */
export function Donut({
  parts,
  size = 140,
  stroke = 16,
  children,
}: {
  parts: { pct: number; tone: string }[]
  size?: number
  stroke?: number
  children?: ReactNode
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offsets = parts.map((_, i) => parts.slice(0, i).reduce((sum, p) => sum + (c * p.pct) / 100, 0))
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-surface-container" />
        {parts.map((p, i) => (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeDasharray={`${Math.max(0, (c * p.pct) / 100 - (parts.length > 1 ? 3 : 0))} ${c}`}
            strokeDashoffset={-offsets[i]}
            strokeLinecap="round"
            className={p.tone}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center leading-tight">{children}</div>
    </div>
  )
}

/** A small spinning ring for something in progress. */
export function Spinner({ size = 12 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent"
      style={{ width: size, height: size }}
    />
  )
}

const themes: [ThemeChoice, string, ReactNode][] = [
  ['system', 'System', <IconComputer key="s" width={16} height={16} />],
  ['light', 'Light', <IconLight key="l" width={16} height={16} />],
  ['dark', 'Dark', <IconDark key="d" width={16} height={16} />],
]

/** System, light or dark: a segmented control. */
export function ThemeSwitch({ round = false }: { round?: boolean }) {
  const [choice, setChoice] = useTheme()
  // The new theme opens as a circle from the pressed segment.
  function pick(value: ThemeChoice, e: MouseEvent<HTMLButtonElement>) {
    const root = document.documentElement
    if (!document.startViewTransition || value === choice) return setChoice(value)
    root.style.setProperty('--reveal-x', `${e.clientX}px`)
    root.style.setProperty('--reveal-y', `${e.clientY}px`)
    root.classList.add('theme-reveal')
    document
      .startViewTransition(() => flushSync(() => setChoice(value)))
      .finished.finally(() => root.classList.remove('theme-reveal'))
  }
  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={`flex ${round ? 'rounded-full bg-surface-container-lowest/80 p-1 shadow-soft' : 'h-8 rounded-sm bg-surface-container p-0.5'}`}
    >
      {themes.map(([value, label, icon]) => (
        <button
          key={value}
          role="radio"
          aria-checked={choice === value}
          title={label}
          onClick={(e) => pick(value, e)}
          className={`flex items-center justify-center ${round ? 'h-8 w-8 rounded-full' : 'flex-1 rounded-xs px-2.5'} ${
            round ? (choice === value ? 'bg-surface-container text-on-surface' : 'text-on-surface-variant') : segment(choice === value)
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
      {step(1, 'New password')}
      <span className="h-px flex-1 bg-hairline" />
      {step(2, 'Two-step sign-in')}
    </div>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-xs border border-hairline bg-surface-container-lowest px-1 tabular-nums text-label-small text-on-surface-variant">
      {children}
    </kbd>
  )
}

/** A refusal or a lock, in the error colours. */
export function Notice({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="animate-rise rounded-2xl bg-error-container px-3.5 py-2.5 text-body-medium text-error">
      {children}
    </p>
  )
}

/**
 * A record's initial in its tint, or a member's in `primary`. status adds
 * the dot at the bottom end: `primary` active, `error` suspended.
 */
export function Initial({
  name,
  id,
  size = 32,
  status,
  member = false,
}: {
  name: string
  id: string
  size?: number
  status?: PersonStatus
  member?: boolean
}) {
  const dot = Math.max(8, Math.round(size * 0.26))
  return (
    <span className="relative inline-flex shrink-0">
      <span
        className={`flex items-center justify-center rounded-full font-semibold uppercase ${member ? 'bg-primary text-on-primary' : tintOf(id)}`}
        style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
      >
        {name.trim()[0] ?? '?'}
      </span>
      {status && status !== 'deleted' && (
        <span
          className={`absolute bottom-0 right-0 rounded-full ring-2 ring-surface-container-lowest ${status === 'suspended' ? 'bg-error' : 'bg-primary'}`}
          style={{ width: dot, height: dot }}
        />
      )}
    </span>
  )
}

/** A tick box, 18 px; the label is the caller's. */
export function Check({ on }: { on: boolean }) {
  return (
    <span className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] ${on ? 'bg-primary text-on-primary' : 'border-2 border-outline-variant'}`}>
      {on && <IconCheck width={13} height={13} />}
    </span>
  )
}

/** The agent's mascot at the start of an answer. */
export function Mascot({ size = 32 }: { size?: number }) {
  return (
    <img
      src="/art-ai-reading.webp"
      alt=""
      className="mt-0.5 shrink-0 rounded-full bg-primary/8 object-contain p-0.5"
      style={{ width: size, height: size }}
    />
  )
}
