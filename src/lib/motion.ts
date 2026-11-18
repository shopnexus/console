import { useEffect, useRef, useState } from 'react'

// The chat's motion (DESIGN.md, "Chat motion"): text revealed at an easing
// speed, entrances only for what arrives now, counts that count up, and a
// wait that shows only when it lasts.

/** The slowest the reveal aims for, so a pause in what arrives still moves. */
const MIN_CHARS_PER_SECOND = 40
/** How far behind what has arrived the screen aims to run. */
const LAG_SECONDS = 0.6
/** How quickly the speed follows its target, so a burst eases in. */
const SPEED_EASE_MS = 300

export interface Reveal {
  progress: number
  speed: number
}

/** One frame of the reveal: the speed eases toward clearing the backlog within the lag, never under the floor. */
export function advanceReveal(length: number, reveal: Reveal, elapsedMs: number): Reveal {
  const backlog = length - reveal.progress
  if (backlog <= 0) return { progress: length, speed: 0 }
  const target = Math.max(MIN_CHARS_PER_SECOND, backlog / LAG_SECONDS)
  const ease = 1 - Math.exp(-elapsedMs / SPEED_EASE_MS)
  const speed = reveal.speed + (target - reveal.speed) * ease
  const step = (Math.max(speed, MIN_CHARS_PER_SECOND) * elapsedMs) / 1000
  return { progress: Math.min(length, reveal.progress + step), speed }
}

/**
 * The visible length at progress, moved past what cannot stand alone: a
 * combining mark, which would show a Vietnamese vowel without its tone for a
 * frame, and the second half of a surrogate pair.
 */
export function revealEnd(text: string, progress: number): number {
  let end = Math.min(text.length, Math.floor(progress))
  while (end > 0 && end < text.length) {
    const code = text.charCodeAt(end)
    const low = code >= 0xdc00 && code <= 0xdfff
    if (!low && !/\p{M}/u.test(text.charAt(end))) break
    end += 1
  }
  return end
}

/**
 * The part of text to show while it arrives. It starts empty when animate is
 * set on the first render and full otherwise, so a reply read from history is
 * there at once; once text stops arriving it plays out the rest.
 */
export function useSmoothReveal(text: string, animate: boolean): { shown: string; revealing: boolean } {
  const [start] = useState(() => (animate ? 0 : text.length))
  const reveal = useRef<Reveal>({ progress: start, speed: 0 })
  const [shownLength, setShownLength] = useState(start)
  const textRef = useRef(text)
  useEffect(() => {
    textRef.current = text
    if (reveal.current.progress > text.length) reveal.current = { progress: text.length, speed: 0 }
    if (reveal.current.progress >= text.length) {
      setShownLength(text.length)
      return
    }
    const loop = { frame: 0, last: -1 }
    const tick = (now: number) => {
      const current = textRef.current
      // A hidden tab pauses frames; the first one back must not leap.
      const elapsed = loop.last < 0 ? 16 : Math.min(now - loop.last, 64)
      loop.last = now
      reveal.current = advanceReveal(current.length, reveal.current, elapsed)
      setShownLength(revealEnd(current, reveal.current.progress))
      if (reveal.current.progress < current.length) loop.frame = requestAnimationFrame(tick)
    }
    loop.frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(loop.frame)
  }, [text])
  const end = Math.min(shownLength, text.length)
  return { shown: text.slice(0, end), revealing: end < text.length }
}

/** How long after a thread opens something mounting is part of that first paint rather than news. */
const SETTLE_MS = 800

let openedAt = Number.NEGATIVE_INFINITY
const seen = new Set<string>()

/** Marks the moment a thread draws its turns; whatever mounts within the settle window draws still. */
export function markThreadOpened(at = performance.now()) {
  openedAt = at
}

/** Whether something arrives now and may play an entrance; an id keeps the entrance to once, across remounts. */
export function arrivalOf(id: string | undefined, now: number, whileOpening = false): boolean {
  const late = whileOpening || now - openedAt > SETTLE_MS
  if (id === undefined) return late
  const first = !seen.has(id)
  seen.add(id)
  return late && first
}

export function useArrival(id?: string, whileOpening = false): boolean {
  const [arrived] = useState(() => arrivalOf(id, performance.now(), whileOpening))
  return arrived
}

/** How long one count takes to reach its value. */
const COUNT_UP_MS = 1000

/** Where a count stands elapsedMs into moving from from to to; linear, so a new value picks up where it stands. */
export function countAt(from: number, to: number, elapsedMs: number): number {
  const share = Math.min(1, Math.max(0, elapsedMs / COUNT_UP_MS))
  return from + (to - from) * share
}

/** A number counted up to from zero when animate is set, and shown as is otherwise. */
export function useCountUp(value: number, animate: boolean): number {
  const [shown, setShown] = useState(0)
  useEffect(() => {
    if (!animate) return
    const loop = { frame: 0, start: -1 }
    const tick = (now: number) => {
      if (loop.start < 0) loop.start = now
      const next = countAt(0, value, now - loop.start)
      setShown(next)
      if (next !== value) loop.frame = requestAnimationFrame(tick)
    }
    loop.frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(loop.frame)
  }, [value, animate])
  return animate ? shown : value
}

/** A figure such as "86", "41%" or "6.2 h" counted up on arrival: the number moves, the rest stays. */
export function splitFigure(value: string): { before: string; n: number; decimals: number; after: string } | undefined {
  const m = /^([^\d-]*)(-?\d+(?:[.,]\d+)?)(.*)$/.exec(value)
  if (!m) return undefined
  const num = m[2].replace(',', '.')
  return { before: m[1], n: Number(num), decimals: num.includes('.') ? num.split('.')[1].length : 0, after: m[3] }
}

/** Whether the reader has asked for less movement. */
export function reducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}
