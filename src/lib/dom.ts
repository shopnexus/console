import { type CSSProperties, type RefObject, useEffect, useLayoutEffect, useRef, useState } from 'react'

/**
 * Closes a menu or popover on a press outside it or on Escape. Put the
 * returned ref on the element that holds both the trigger and the menu.
 */
export function useDismiss<T extends HTMLElement>(open: boolean, close: () => void) {
  const ref = useRef<T>(null)
  useEffect(() => {
    if (!open) return
    const down = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) close()
    }
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('pointerdown', down)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('pointerdown', down)
      document.removeEventListener('keydown', key)
    }
  }, [open, close])
  return ref
}

/** True when a key press lands in a field, where single-key shortcuts stay out of the way. */
export function typing(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null
  return !!t?.closest('input, textarea, select, [contenteditable]') || e.metaKey || e.ctrlKey || e.altKey
}

/**
 * Pins a popover to its trigger with fixed positioning, so a nav that
 * scrolls or clips its overflow neither cuts the popover off nor slides
 * sideways when a field in it takes focus. Put the ref on the element that
 * holds the trigger; the popover opens below it, or above it at the bottom.
 */
export function useAnchor(ref: RefObject<HTMLElement | null>, open: boolean, side: 'below' | 'above'): CSSProperties {
  const [style, setStyle] = useState<CSSProperties>({})
  useLayoutEffect(() => {
    if (!open || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    setStyle(side === 'below' ? { left: r.left, top: r.bottom + 4 } : { left: r.left, bottom: window.innerHeight - r.top + 4 })
  }, [ref, open, side])
  return style
}
