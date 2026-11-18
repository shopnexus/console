import type { ReactNode } from 'react'
import IconAccount from '~icons/material-symbols-light/person-outline-rounded'
import IconData from '~icons/material-symbols-light/monitoring'
import IconListing from '~icons/material-symbols-light/storefront-outline-rounded'
import IconLog from '~icons/material-symbols-light/history-rounded'
import IconOrder from '~icons/material-symbols-light/package-2-outline'
import IconReport from '~icons/material-symbols-light/flag-outline-rounded'
import IconTicket from '~icons/material-symbols-light/support-agent-outline'
import type { SourceKind } from '../../lib/run'

const looks: Record<SourceKind, [string, (s: number) => ReactNode, string]> = {
  report: ['Report case', (s) => <IconReport width={s} height={s} />, 'bg-error-container text-error'],
  account: ['Account', (s) => <IconAccount width={s} height={s} />, 'bg-primary/8 text-primary'],
  ticket: ['Ticket', (s) => <IconTicket width={s} height={s} />, 'bg-secondary-container text-on-secondary-container'],
  order: ['Order', (s) => <IconOrder width={s} height={s} />, 'bg-tertiary-fixed text-on-tertiary-fixed-variant'],
  listing: ['Listing', (s) => <IconListing width={s} height={s} />, 'bg-inverse-primary/40 text-primary-container'],
  data: ['Data', (s) => <IconData width={s} height={s} />, 'bg-tertiary-fixed text-on-tertiary-fixed-variant'],
  log: ['Audit log', (s) => <IconLog width={s} height={s} />, 'bg-surface-container text-on-surface-variant'],
}

/** A source's kind as a small round icon in its tint. */
export function SourceBadge({ kind, size = 20 }: { kind: SourceKind; size?: number }) {
  const [, icon, tone] = looks[kind] ?? looks.data
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full ${tone}`} style={{ width: size, height: size }}>
      {icon(Math.round(size * 0.6))}
    </span>
  )
}

/** The letter marks' inks, after AI Portal's source-avatar palette, in our colours. */
const avatarInks = ['--md-primary', '--md-tertiary', '--md-chart-2', '--md-chart-3']

/** A source's letter mark: its first letter on a tint picked from its name, so one source keeps one colour. */
export function SourceAvatar({ seed, size = 24, ring = false }: { seed: string; size?: number; ring?: boolean }) {
  let hash = 0
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) | 0
  const ink = `var(${avatarInks[Math.abs(hash) % avatarInks.length]})`
  return (
    <span
      aria-hidden
      className="flex shrink-0 select-none items-center justify-center rounded-full font-bold leading-none"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.44,
        color: ink,
        background: `color-mix(in srgb, ${ink} 14%, var(--md-surface-container-lowest))`,
        boxShadow: ring ? '0 0 0 1.5px var(--md-surface-container-lowest)' : undefined,
      }}
    >
      {(seed.trim()[0] ?? '?').toUpperCase()}
    </span>
  )
}
