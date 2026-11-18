import { type CSSProperties, type KeyboardEvent, type ReactNode, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import IconCheck from '~icons/material-symbols-light/check-rounded'
import IconExpand from '~icons/material-symbols-light/expand-more-rounded'
import IconSearch from '~icons/material-symbols-light/search-rounded'

export interface SelectOption<T extends string> {
  value: T
  label: ReactNode
  /** Plain text of the label, for type-ahead and search when the label is not a string. */
  text?: string
  icon?: ReactNode
  hint?: ReactNode
  disabled?: boolean
}

const textOf = <T extends string>(o: SelectOption<T>) => o.text ?? (typeof o.label === 'string' ? o.label : o.value)

/**
 * The console's select, in place of the browser's: a trigger like the other
 * inputs, and a listbox in a popover drawn on top of everything (a portal
 * pinned to the trigger), so it works inside menus and dialogs. Arrows, Home
 * and End move, letters jump by type-ahead, Enter picks, Escape and a press
 * outside close. searchable adds a search field at the top.
 */
export function Select<T extends string>({
  value,
  onChange,
  options,
  label,
  placeholder = 'Pick one',
  searchable = false,
  size = 'md',
  tone,
  className = '',
  disabled = false,
  leading,
  menuWidth,
  footer,
}: {
  value: T | undefined
  onChange: (v: T) => void
  options: SelectOption<T>[]
  label: string
  placeholder?: string
  searchable?: boolean
  size?: 'sm' | 'md' | 'lg'
  /** Classes for the trigger's colours, as the term select's error tint. */
  tone?: string
  className?: string
  disabled?: boolean
  /** Shown at the start of the trigger, as a provider tile. */
  leading?: ReactNode
  menuWidth?: number
  footer?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [q, setQ] = useState('')
  const [style, setStyle] = useState<CSSProperties>({})
  const trigger = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const typed = useRef({ text: '', at: 0 })
  const id = useId()
  const current = options.find((o) => o.value === value)
  const needle = q.trim().toLowerCase()
  const shown = searchable && needle ? options.filter((o) => textOf(o).toLowerCase().includes(needle)) : options

  const close = useCallback(() => {
    setOpen(false)
    setQ('')
    trigger.current?.focus()
  }, [])

  function show() {
    if (disabled) return
    setActive(Math.max(0, options.findIndex((o) => o.value === value)))
    setOpen(true)
  }

  useLayoutEffect(() => {
    if (!open || !trigger.current) return
    const r = trigger.current.getBoundingClientRect()
    const width = menuWidth ?? Math.max(r.width, 200)
    const below = window.innerHeight - r.bottom
    const left = Math.min(r.left, window.innerWidth - width - 8)
    setStyle(below < 280 && r.top > below ? { left, bottom: window.innerHeight - r.top + 6, width } : { left, top: r.bottom + 6, width })
  }, [open, menuWidth])

  useEffect(() => {
    if (!open) return
    const down = (e: PointerEvent) => {
      const t = e.target as Node
      if (!menu.current?.contains(t) && !trigger.current?.contains(t)) {
        setOpen(false)
        setQ('')
      }
    }
    const away = () => setOpen(false)
    document.addEventListener('pointerdown', down)
    window.addEventListener('resize', away)
    return () => {
      document.removeEventListener('pointerdown', down)
      window.removeEventListener('resize', away)
    }
  }, [open])

  useEffect(() => {
    if (open) menu.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  function pick(o: SelectOption<T> | undefined) {
    if (!o || o.disabled) return
    onChange(o.value)
    close()
  }

  function move(step: number) {
    if (shown.length === 0) return
    let i = active
    for (let n = 0; n < shown.length; n++) {
      i = (i + step + shown.length) % shown.length
      if (!shown[i].disabled) break
    }
    setActive(i)
  }

  function onKey(e: KeyboardEvent) {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault()
        show()
      }
      return
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      move(e.key === 'ArrowDown' ? 1 : -1)
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault()
      setActive(e.key === 'Home' ? 0 : shown.length - 1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      pick(shown[active])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      close()
    } else if (e.key === 'Tab') {
      setOpen(false)
    } else if (!searchable && e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
      // Type-ahead: letters typed within a second find the next option that starts with them.
      const now = Date.now()
      typed.current = { text: (now - typed.current.at < 1000 ? typed.current.text : '') + e.key.toLowerCase(), at: now }
      const i = shown.findIndex((o) => textOf(o).toLowerCase().startsWith(typed.current.text))
      if (i >= 0) setActive(i)
    }
  }

  const height = size === 'sm' ? 'h-8 rounded-full px-3 text-label-small' : size === 'lg' ? 'h-11 rounded-xl px-3.5 text-body-medium' : 'h-10 rounded-xl px-3 text-body-medium'

  return (
    <>
      <button
        ref={trigger}
        type="button"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        disabled={disabled}
        onClick={() => (open ? close() : show())}
        onKeyDown={onKey}
        className={`flex w-full min-w-0 items-center gap-2 border text-left outline-none disabled:opacity-60 ${height} ${
          tone ?? 'border-hairline bg-surface-container-lowest'
        } ${open ? 'border-primary/50 ring-4 ring-primary/10' : 'focus-visible:border-primary/50 focus-visible:ring-4 focus-visible:ring-primary/10'} ${className}`}
      >
        {leading ?? current?.icon}
        <span className={`min-w-0 flex-1 truncate ${current ? '' : 'text-on-surface-variant'}`}>{current ? current.label : placeholder}</span>
        <IconExpand width={size === 'sm' ? 15 : 18} height={size === 'sm' ? 15 : 18} className={`shrink-0 text-on-surface-variant transition-transform duration-(--duration-effects-default) ${open ? 'rotate-180' : ''}`} />
      </button>
      {open &&
        createPortal(
          <div
            ref={menu}
            style={style}
            onKeyDown={onKey}
            className={`fixed z-50 animate-pop rounded-3xl border border-hairline bg-surface-container-lowest p-1.5 shadow-float ${style.bottom !== undefined ? 'origin-bottom' : 'origin-top'}`}
          >
            {searchable && (
              <label className="mb-1 flex h-10 items-center gap-2 rounded-xl bg-surface-container-low px-3 text-on-surface-variant">
                <IconSearch width={17} height={17} />
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value)
                    setActive(0)
                  }}
                  placeholder="Search"
                  aria-label={`Search ${label.toLowerCase()}`}
                  className="h-full min-w-0 flex-1 bg-transparent text-body-medium text-on-surface outline-none placeholder:text-on-surface-variant"
                />
              </label>
            )}
            <div id={id} role="listbox" aria-label={label} tabIndex={-1} className="max-h-[300px] overflow-y-auto" ref={(el) => (searchable ? undefined : el?.focus())}>
              {shown.map((o, i) => {
                const on = o.value === value
                return (
                  <div
                    key={o.value}
                    data-index={i}
                    role="option"
                    aria-selected={on}
                    aria-disabled={o.disabled}
                    onPointerEnter={() => setActive(i)}
                    onClick={() => pick(o)}
                    className={`flex min-h-9 cursor-pointer items-center gap-2.5 rounded-[10px] px-2.5 py-1.5 text-body-medium ${o.disabled ? 'cursor-default opacity-45' : ''} ${
                      i === active && !o.disabled ? 'bg-primary/6' : ''
                    }`}
                  >
                    {o.icon}
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block truncate">{o.label}</span>
                      {o.hint && <span className="mt-0.5 block truncate text-body-small text-on-surface-variant">{o.hint}</span>}
                    </span>
                    <span className="w-5 shrink-0">{on && <IconCheck width={18} height={18} className="text-primary" />}</span>
                  </div>
                )
              })}
              {shown.length === 0 && <p className="px-2.5 py-2 text-body-medium text-on-surface-variant">Nothing matches.</p>}
            </div>
            {footer}
          </div>,
          document.body,
        )}
    </>
  )
}
