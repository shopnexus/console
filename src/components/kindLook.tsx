import type { ComponentType, SVGProps } from 'react'
import IconAccount from '~icons/material-symbols-light/person-outline-rounded'
import IconBolt from '~icons/material-symbols-light/bolt-outline-rounded'
import IconChat from '~icons/material-symbols-light/chat-outline-rounded'
import IconData from '~icons/material-symbols-light/monitoring'
import IconListing from '~icons/material-symbols-light/storefront-outline-rounded'
import IconLog from '~icons/material-symbols-light/history-rounded'
import IconMember from '~icons/material-symbols-light/badge-outline'
import IconOrder from '~icons/material-symbols-light/package-2-outline'
import IconReport from '~icons/material-symbols-light/flag-outline-rounded'
import IconSupport from '~icons/material-symbols-light/support-agent-outline'
import type { AttachmentKind } from '../lib/agent'
import type { SourceKind } from '../lib/run'
import { kindOf } from '../lib/sources'

type Icon = ComponentType<SVGProps<SVGSVGElement>>

// The icons and tints of record kinds. Names and pages are in lib/sources.

/** A source's icon and tint, in the sources panel and the tools list. */
const sourceLooks: Record<SourceKind, [Icon, string]> = {
  report: [IconReport, 'bg-surface-container-high text-on-surface'],
  account: [IconAccount, 'bg-primary/8 text-primary'],
  ticket: [IconSupport, 'bg-secondary-container text-on-secondary-container'],
  order: [IconOrder, 'bg-surface-container text-on-surface-variant'],
  listing: [IconListing, 'bg-inverse-primary/40 text-primary-container'],
  data: [IconData, 'bg-surface-container text-on-surface-variant'],
  log: [IconLog, 'bg-surface-container text-on-surface-variant'],
  member: [IconMember, 'bg-secondary-container text-on-secondary-container'],
}

/** A kind's icon alone, for a group's header or a tool's tile. */
export function KindIcon({ kind, size }: { kind: SourceKind; size: number }) {
  const [I] = sourceLooks[kindOf(kind)]
  return <I width={size} height={size} />
}

/** A source's kind as a small round icon in its tint; tile makes it a rounded square, for a record without a name. */
export function SourceBadge({ kind, size = 20, tile = false }: { kind: SourceKind; size?: number; tile?: boolean }) {
  const [I, tone] = sourceLooks[kindOf(kind)]
  const icon = Math.round(size * (tile ? 0.53 : 0.6))
  return (
    <span className={`flex shrink-0 items-center justify-center ${tile ? 'rounded-[10px]' : 'rounded-full'} ${tone}`} style={{ width: size, height: size }}>
      <I width={icon} height={icon} />
    </span>
  )
}

/** The record a chat is about or a question attaches; a ticket is its order's parcel. */
const recordIcons: Record<AttachmentKind, Icon> = {
  ticket: IconOrder,
  account: IconAccount,
  report_case: IconReport,
  order: IconOrder,
  listing: IconListing,
  document: IconBolt,
}

/** The icon of an attached record or a chat's subject; a chat without one shows a speech bubble. */
export function RecordIcon({ kind, size = 16 }: { kind?: AttachmentKind; size?: number }) {
  const I = kind ? recordIcons[kind] : IconChat
  return <I width={size} height={size} />
}

/** The letter marks' inks, after AI Portal's source-avatar palette, in teal and greys. */
const avatarInks = ['--md-primary', '--md-secondary', '--md-chart-2', '--md-on-surface-variant']

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
