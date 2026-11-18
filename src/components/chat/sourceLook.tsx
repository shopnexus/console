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
