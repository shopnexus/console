import { type ReactNode, useCallback, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router'
import IconOpen from '~icons/material-symbols-light/north-east-rounded'
import IconCopy from '~icons/material-symbols-light/content-copy-outline-rounded'
import IconCheck from '~icons/material-symbols-light/check-rounded'
import type { RecordKind } from '../../lib/markdown'
import { usePanel } from '../../lib/panel'
import type { Source } from '../../lib/run'
import { clipped, hasName, idTail, kindName, kindOf, openLabel, sourceHref, sourceLabel, sourceMeta } from '../../lib/sources'
import { useMe } from '../../lib/session'
import { useAnchor, useCopy, useDismiss, useHoverOpen } from '../../lib/dom'
import { Initial } from '../ui'
import { KindIcon, SourceAvatar } from '../kindLook'
import { RecordPreview } from './RecordPreview'

// Records and claims in an answer's text: a record the agent names is a teal
// pill that previews the record in place; a sentence a source backs has a
// dotted line that shows the source. Neither needs a source number.

/** A source number set in the text: an 18px pill sitting just above the line (AI Portal's CitePill). */
export function CitePill({ n, className = '' }: { n: number; className?: string }) {
  return (
    <span
      className={`mx-px inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-surface-container-high px-[5px] align-[2px] text-[11px] font-medium leading-none tabular-nums text-on-surface-variant ${className}`}
    >
      {n}
    </span>
  )
}

/**
 * A card over the text, opened from an inline trigger: on rest after 200 ms,
 * or pinned by a click until a press elsewhere. inline keeps a trigger that
 * runs over lines (a claim) wrapping with the text. A card inside another's
 * trigger (a pill in a claim) opens alone; own(e) says an event is this card's.
 */
export function HoverCard({
  label,
  width,
  prefer = 'below',
  room = 280,
  inline = false,
  escape = true,
  trigger,
  children,
}: {
  label: string
  width: number
  prefer?: 'below' | 'above'
  room?: number
  inline?: boolean
  escape?: boolean
  trigger: (s: { open: boolean; set: (next: boolean, pin?: boolean) => void; own: (e: { target: EventTarget }) => boolean }) => ReactNode
  children: (close: () => void) => ReactNode
}) {
  const id = useId()
  const ownTarget = useCallback((t: EventTarget) => t instanceof Element && t.closest('[data-hover-card]')?.getAttribute('data-hover-card') === id, [id])
  const own = useCallback((e: { target: EventTarget }) => ownTarget(e.target), [ownTarget])
  const { open, set, hover } = useHoverOpen(ownTarget)
  const card = useRef<HTMLDivElement>(null)
  const close = useCallback(() => set(false), [set])
  const anchor = useDismiss<HTMLSpanElement>(open, close, { also: [card], escape })
  const at = useAnchor(anchor, open, { side: 'auto', prefer, room, gap: 6, width, inset: 12, dx: -12 })
  return (
    <span ref={anchor} data-hover-card={id} className={inline ? '' : 'relative inline-block'} {...hover}>
      {trigger({ open, set, own })}
      {open &&
        createPortal(
          <div
            ref={card}
            role="dialog"
            aria-label={label}
            data-hover-card={id}
            style={at}
            {...hover}
            className={`fixed z-50 max-w-[calc(100vw-24px)] animate-pop rounded-2xl bg-surface-container-lowest p-3.5 text-left text-on-surface shadow-pop ${at.top === undefined ? 'origin-bottom-left' : 'origin-top-left'}`}
          >
            {children(close)}
          </div>,
          document.body,
        )}
    </span>
  )
}

const action = 'flex h-7 items-center gap-1.5 rounded-lg px-1.5 transition-colors duration-150 hover:bg-on-surface/8'

/** One source in a card: its name, its line, its number, and the quote when it is the only one. */
export function SourceCard({ s, quote = true }: { s: Source; quote?: boolean }) {
  const label = sourceLabel(s)
  return (
    <>
      <span className="flex min-w-0 items-center gap-2.5">
        <SourceAvatar seed={label} />
        <span className="min-w-0 flex-1 leading-4">
          <span title={label} className="block truncate text-[13.5px] font-medium leading-5 text-on-surface">
            {label}
          </span>
          <span className="block truncate text-[12px] text-outline">{sourceMeta(s)}</span>
        </span>
        <CitePill n={s.n} className="m-0 shrink-0" />
      </span>
      {quote && s.quote && <span className="mt-2.5 block border-l-2 border-primary pl-3 text-[13px] leading-5 text-on-surface-variant">{clipped(s.quote)}</span>}
    </>
  )
}

/** The way into a source's record, and into the sources panel at it. */
export function SourceActions({ s, turnId, close }: { s: Source; turnId: string; close: () => void }) {
  const { open: openPanel } = usePanel()
  const me = useMe()
  const href = sourceHref(s, me.role === 'admin')
  return (
    <span className="mt-2 flex items-center gap-2 text-[12.5px] font-medium text-on-surface">
      {href && (
        <Link to={href} className={`-ml-1.5 ${action}`}>
          {openLabel(s)}
          <IconOpen width={14} height={14} />
        </Link>
      )}
      <button
        type="button"
        className={`${href ? '' : '-ml-1.5'} ${action} font-normal text-outline`}
        onClick={() => {
          close()
          openPanel({ kind: 'sources', turnId, n: s.n })
        }}
      >
        Show in sources
      </button>
    </span>
  )
}

/**
 * The words a source backs, with a dotted line under them; resting on them
 * shows the sources, a click opens the sources panel at the first.
 */
export function Claim({ ns, turnId, children }: { ns: number[]; turnId: string; children: ReactNode }) {
  const { sourcesOf, open: openPanel, panel } = usePanel()
  const sources = ns.map((n) => sourcesOf(turnId).find((s) => s.n === n)).filter((s): s is Source => !!s)
  const showing = panel?.kind === 'sources' && panel.turnId === turnId && ns.includes(panel.n ?? -1)
  if (sources.length === 0) return <>{children}</>
  return (
    <HoverCard
      label={sources.length === 1 ? `Source ${sources[0].n}` : `${sources.length} sources`}
      width={340}
      prefer="above"
      room={240}
      inline
      escape={false}
      trigger={({ open, set, own }) => (
        <span
          role="button"
          tabIndex={0}
          data-panel-trigger=""
          onClick={(e) => {
            if (!own(e)) return
            set(false)
            openPanel(showing ? undefined : { kind: 'sources', turnId, n: sources[0].n })
          }}
          onKeyDown={(e) => own(e) && e.key === 'Enter' && openPanel({ kind: 'sources', turnId, n: sources[0].n })}
          className={`cursor-pointer rounded-[4px] underline decoration-dotted decoration-[1.5px] underline-offset-[5px] transition-colors duration-[120ms] ${open || showing ? 'bg-primary/6 decoration-primary' : 'decoration-outline hover:decoration-primary'}`}
        >
          {children}
        </span>
      )}
    >
      {(close) =>
        sources.length === 1 ? (
          <>
            <SourceCard s={sources[0]} />
            <SourceActions s={sources[0]} turnId={turnId} close={close} />
          </>
        ) : (
          <>
            <span className="block space-y-2.5">
              {sources.map((s) => (
                <span key={s.n} className="block">
                  <SourceCard s={s} quote={false} />
                </span>
              ))}
            </span>
            <SourceActions s={sources[0]} turnId={turnId} close={close} />
          </>
        )
      }
    </HoverCard>
  )
}

// A name that is no name: an id, or the agent's "No name".
const noName = /^([0-9a-f]{8}-[0-9a-f-]{27}|no name|no display name)$/i

const chip = (on: boolean) =>
  `mx-px inline-flex h-[23px] max-w-[280px] items-center gap-[5px] whitespace-nowrap rounded-full pl-[3px] pr-[9px] align-middle text-[13.5px] font-medium leading-none text-primary transition-colors duration-[120ms] ${on ? 'bg-primary/13 ring-[1.5px] ring-inset ring-primary' : 'bg-primary/7 hover:bg-primary/13'}`

/** A record the answer names: a teal pill with the kind or the person's initial; it previews the record in place. */
export function RecordChip({ kind, id, label: written, turnId }: { kind: RecordKind; id: string; label: string; turnId: string }) {
  const { panel, sourcesOf } = usePanel()
  const beside = panel?.kind === 'record' && panel.record === kind && panel.id === id
  // A ticket goes by its request, as its source names it, whatever the answer wrote.
  const source = kind === 'ticket' ? sourcesOf(turnId).find((s) => s.record_id?.toLowerCase() === id.toLowerCase()) : undefined
  const label = source && hasName(source) ? sourceLabel(source) : written
  const named = label.trim() !== '' && !noName.test(label.trim())
  const name = named ? label.trim() : 'No name'
  return (
    <HoverCard
      label={`${kindName(kind)}: ${name}`}
      width={kind === 'ticket' ? 420 : 372}
      trigger={({ open, set }) => (
        <button type="button" data-panel-trigger="" onClick={() => set(!open, true)} aria-expanded={open} className={chip(open || beside)}>
          {kind === 'account' ? (
            <Initial name={named ? name : '?'} id={id} size={17} />
          ) : (
            <span className="flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-full bg-surface-container-lowest">
              <KindIcon kind={kind} size={13} />
            </span>
          )}
          <span className={`truncate ${named ? '' : 'text-primary/70'}`}>{name}</span>
          {!named && <span className="font-mono text-[11.5px] font-normal text-primary/55">{idTail(id)}</span>}
        </button>
      )}
    >
      {(close) => <RecordPreview kind={kind} id={id} label={name} turnId={turnId} close={close} />}
    </HoverCard>
  )
}

const recordKinds = new Set<string>(['account', 'ticket', 'listing', 'order', 'report'])

/**
 * An id the agent left bare: the chip of the source it belongs to, or the
 * id shortened in the middle, copied on a click.
 */
export function IdMention({ id, turnId }: { id: string; turnId: string }) {
  const { sourcesOf } = usePanel()
  const [copied, copy] = useCopy()
  const s = sourcesOf(turnId).find((x) => x.record_id?.toLowerCase() === id)
  const kind = s && kindOf(s.kind)
  if (s && kind && recordKinds.has(kind)) return <RecordChip kind={kind as RecordKind} id={id} label={hasName(s) ? sourceLabel(s) : ''} turnId={turnId} />
  const Icon = copied ? IconCheck : IconCopy
  return (
    <button
      type="button"
      title={copied ? 'Copied' : 'Copy id'}
      onClick={() => copy(id)}
      className="mx-px inline-flex h-[23px] items-center gap-1 rounded-md px-1 align-middle font-mono text-[12px] leading-none text-on-surface-variant transition-colors duration-[120ms] hover:bg-surface-container"
    >
      {id.slice(0, 8)}…{id.slice(-4)}
      <Icon width={13} height={13} className="text-outline" />
    </button>
  )
}
