// Dates, times and numbers in the console's English, on 24-hour clocks.

const timeFmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' })
const dayFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })
const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const intFmt = new Intl.NumberFormat('en-US')

/** "10:04". */
export const time = (iso: string | number | Date) => timeFmt.format(new Date(iso))

/** "Nov 18", or "Nov 18, 2025" in another year. */
export function day(iso: string | number | Date): string {
  const d = new Date(iso)
  return d.getFullYear() === new Date().getFullYear() ? dayFmt.format(d) : dateFmt.format(d)
}

/** "Nov 18, 2026". */
export const date = (iso: string | number | Date) => dateFmt.format(new Date(iso))

/** The time today, "Yesterday", or the day. */
export function when(iso: string, now = Date.now()): string {
  const d = new Date(iso)
  const today = new Date(now)
  if (d.toDateString() === today.toDateString()) return time(d)
  const y = new Date(now)
  y.setDate(y.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return 'Yesterday'
  return day(d)
}

/** "Nov 18 10:04". */
export const stamp = (iso: string) => `${day(iso)} ${time(iso)}`

/** 1,284. */
export const int = (n: number) => intFmt.format(n)

/** A price in đồng: "8,900,000 ₫". */
export const vnd = (n: number) => `${intFmt.format(n)} ₫`

/** Dollars with cents: "$142.30"; below a cent, three places: "$0.049". */
export function usd(n: number): string {
  if (n !== 0 && Math.abs(n) < 0.1) return `$${n.toFixed(3)}`
  return `$${n.toFixed(2)}`
}

/** 18,402 as "18.4K", 1,200,000 as "1.2M". */
export function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  return String(n)
}

/** A duration: "38 ms", "2.1 s", "42 s", "3 min 10 s", "1 h 5 min". */
export function duration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`
  if (ms < 10_000) return `${(ms / 1000).toFixed(1)} s`
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s} s`
  if (s < 3600) return s % 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s / 60} min`
  const m = Math.round(s / 60)
  return m % 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m / 60} h`
}

/** A running clock: "0:18". */
export function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** "Good morning", "Good afternoon" or "Good evening" for the hour. */
export function greeting(hour = new Date().getHours()): string {
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

/** The first name of a Vietnamese full name: its last word. */
export const firstName = (name: string) => name.trim().split(/\s+/).pop() ?? name
