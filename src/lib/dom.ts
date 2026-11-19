import { type CSSProperties, type PointerEvent as ReactPointerEvent, type RefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

interface DismissOptions {
  /** Presses inside these count as inside too, such as a menu in a portal. */
  also?: RefObject<HTMLElement | null>[]
  /** Presses on an element matching this selector count as inside. */
  ignore?: string
  /** Listen in the capture phase, ahead of the page's own handlers. */
  capture?: boolean
  /** Escape closes it (true), closes it and goes no further ('stop'), or is left alone (false). */
  escape?: boolean | 'stop'
}

/**
 * Closes a menu or popover on a press outside it or on Escape. Put the
 * returned ref on the element that holds both the trigger and the menu.
 */
export function useDismiss<T extends HTMLElement>(
  open: boolean,
  close: () => void,
  { also, ignore, capture = false, escape = true }: DismissOptions = {},
) {
  const ref = useRef<T>(null)
  const extra = useRef(also)
  useEffect(() => {
    extra.current = also
  })
  useEffect(() => {
    if (!open) return
    const down = (e: PointerEvent) => {
      const t = e.target as Element
      if (ref.current?.contains(t) || extra.current?.some((r) => r.current?.contains(t))) return
      if (ignore && t.closest?.(ignore)) return
      close()
    }
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (escape === 'stop') {
        e.stopPropagation()
        e.preventDefault()
      }
      close()
    }
    document.addEventListener('pointerdown', down, capture)
    if (escape) document.addEventListener('keydown', key, capture)
    return () => {
      document.removeEventListener('pointerdown', down, capture)
      document.removeEventListener('keydown', key, capture)
    }
  }, [open, close, ignore, capture, escape])
  return ref
}

/** True when a key press lands in a field, where single-key shortcuts stay out of the way. */
export function typing(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null
  return !!t?.closest('input, textarea, select, [contenteditable]') || e.metaKey || e.ctrlKey || e.altKey
}

interface AnchorOptions {
  /** 'auto' takes the preferred side while it has `room` px, else the roomier one. */
  side: 'below' | 'above' | 'auto'
  prefer?: 'below' | 'above'
  room?: number
  gap?: number
  /** The popover's width, set on it and used to keep it `inset` px inside the window. */
  width?: number
  /** With no width, the trigger's width but at least this. */
  minWidth?: number
  inset?: number
  /** Moves the popover sideways from the trigger's left edge. */
  dx?: number
}

/**
 * Pins a popover to its trigger with fixed positioning, so a nav that
 * scrolls or clips its overflow neither cuts the popover off nor slides
 * sideways when a field in it takes focus. Put the ref on the element that
 * holds the trigger; the popover opens below it, above it, or on whichever
 * side has room.
 */
export function useAnchor(ref: RefObject<HTMLElement | null>, open: boolean, opts: AnchorOptions | 'below' | 'above'): CSSProperties {
  const { side, prefer = 'below', room = 280, gap = 4, width: fixed, minWidth, inset = 8, dx = 0 } = typeof opts === 'string' ? { side: opts } : opts
  const [style, setStyle] = useState<CSSProperties>({})
  useLayoutEffect(() => {
    if (!open || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    const roomBelow = window.innerHeight - r.bottom
    const roomAbove = r.top
    const above =
      side === 'auto'
        ? prefer === 'below'
          ? roomBelow < room && roomAbove > roomBelow
          : roomAbove > room || roomAbove > roomBelow
        : side === 'above'
    const width = fixed ?? (minWidth === undefined ? undefined : Math.max(r.width, minWidth))
    const left = width === undefined ? r.left + dx : Math.max(inset, Math.min(r.left + dx, window.innerWidth - width - inset))
    setStyle({ left, ...(above ? { bottom: window.innerHeight - r.top + gap } : { top: r.bottom + gap }), ...(width === undefined ? {} : { width }) })
  }, [ref, open, side, prefer, room, gap, fixed, minWidth, inset, dx])
  return style
}

/** A clock that ticks once a second while on. */
export function useNow(on: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!on) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [on])
  return now
}

/**
 * j and k move through a list's rows, Escape closes the open one and, when
 * given, Enter opens the first row while none is open. Key presses in a
 * field are left alone.
 */
export function useListKeys<T>(rows: readonly T[], isOpen: (row: T) => boolean, open: (row: T) => void, close: (() => void) | undefined, enter = false) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement).closest('input, textarea, select, [contenteditable]')) return
      const at = rows.findIndex(isOpen)
      if (e.key === 'j' || e.key === 'k') {
        const next = rows[Math.min(rows.length - 1, Math.max(0, at + (e.key === 'j' ? 1 : -1)))]
        if (next) open(next)
      } else if (enter && e.key === 'Enter' && at < 0 && rows[0]) {
        open(rows[0])
      } else if (e.key === 'Escape' && close) {
        close()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [rows, isOpen, open, close, enter])
}

/** Copies text and reports true for 1.2 s, for a button that shows "Copied". */
export function useCopy(): [boolean, (text: string) => void] {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const copy = useCallback((text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {})
    setCopied(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 1200)
  }, [])
  return [copied, copy]
}

/**
 * Opens after resting on it 200 ms, closes 150 ms after leaving; a click
 * opens at once and pins it, so leaving no longer closes it.
 */
export function useHoverOpen() {
  const [open, setOpen] = useState(false)
  const timer = useRef<number>(undefined)
  const pinned = useRef(false)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const schedule = (next: boolean, ms: number) => {
    if (!next && pinned.current) return
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setOpen(next), ms)
  }
  const set = useCallback((next: boolean, pin = next) => {
    window.clearTimeout(timer.current)
    pinned.current = next && pin
    setOpen(next)
  }, [])
  const hover = {
    onPointerEnter: (e: ReactPointerEvent) => e.pointerType === 'mouse' && schedule(true, 200),
    onPointerLeave: (e: ReactPointerEvent) => e.pointerType === 'mouse' && schedule(false, 150),
  }
  return { open, set, hover }
}
