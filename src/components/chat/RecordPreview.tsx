import { type FormEvent, type ReactNode, useState } from 'react'
import { Link } from 'react-router'
import IconOpen from '~icons/material-symbols-light/north-east-rounded'
import IconBeside from '~icons/material-symbols-light/right-panel-open-outline-rounded'
import IconSend from '~icons/material-symbols-light/arrow-upward-rounded'
import IconCopy from '~icons/material-symbols-light/content-copy-outline-rounded'
import IconCheck from '~icons/material-symbols-light/check-rounded'
import IconSteps from '~icons/material-symbols-light/format-list-bulleted-rounded'
import { ApiError } from '../../lib/api'
import { useAccountDetail } from '../../lib/accounts'
import { conditionLabel, humanize, listingStatus, orderStatus, shipmentStatus, useListing, useOrder } from '../../lib/commerce'
import { useCopy, useNow } from '../../lib/dom'
import { count, date, day, duration, time, vnd, when } from '../../lib/format'
import type { RecordKind } from '../../lib/markdown'
import { usePanel } from '../../lib/panel'
import { reasonLabel, reasonsOf, useCase } from '../../lib/reports'
import { idTail, kindName, recordHref } from '../../lib/sources'
import { useMe } from '../../lib/session'
import { failureText, type Person, shopNexusId, ticketTitle, useTicket, useTicketCommands } from '../../lib/support'
import { toolInfo } from '../../lib/tools'
import { IconBtn, Initial, Tag } from '../ui'
import { KindIcon } from '../kindLook'

// A record previewed where the answer names it, so a member reads it without
// leaving the chat: in a card over the text, or beside the chat (wide).

interface PreviewProps {
  kind: RecordKind
  id: string
  /** The name the answer gave it, shown while the record loads. */
  label: string
  turnId?: string
  /** Closes the card; absent beside the chat. */
  close?: () => void
  wide?: boolean
}

const quiet = 'bg-surface-container text-on-surface-variant'

/** The card's head: the kind's tile, the name, one line, and the ways out. */
function Head({ p, title, meta, lead }: { p: PreviewProps; title: string; meta: string; lead?: ReactNode }) {
  const { open } = usePanel()
  const me = useMe()
  const href = recordHref(p.kind, p.id, me.role === 'admin')
  return (
    <div className="flex items-start gap-2.5">
      {lead ?? (
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-primary/8 text-primary">
          <KindIcon kind={p.kind} size={17} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p title={title} className={`truncate font-medium text-on-surface ${p.wide ? 'text-title-medium' : 'text-[14.5px] leading-5'}`}>
          {title}
        </p>
        <p className="mt-0.5 truncate text-[12.5px] text-outline">{meta}</p>
      </div>
      {!p.wide && (
        <IconBtn
          title="Expand beside chat"
          onClick={() => {
            p.close?.()
            open({ kind: 'record', record: p.kind, id: p.id, label: p.label, turnId: p.turnId })
          }}
        >
          <IconBeside width={18} height={18} />
        </IconBtn>
      )}
      {href && (
        <Link to={href} title={`Open ${kindName(p.kind).toLowerCase()}`} aria-label={`Open ${kindName(p.kind).toLowerCase()}`} className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-outline hover:bg-surface-container-low">
          <IconOpen width={16} height={16} />
        </Link>
      )}
    </div>
  )
}

/** Where the agent read the record, with the way into the sources panel. */
function ReadIn({ p }: { p: PreviewProps }) {
  const { sourcesOf, open } = usePanel()
  const s = p.turnId ? sourcesOf(p.turnId).find((x) => x.record_id?.toLowerCase() === p.id) : undefined
  if (!s) return null
  return (
    <div className="mt-3 flex items-center gap-2 border-t border-hairline pt-2.5 text-[12px] text-outline">
      <IconSteps width={14} height={14} />
      <span className="min-w-0 flex-1 truncate">
        Read by <span className="text-on-surface-variant">{s.tool ? toolInfo(s.tool).label.replace(/_/g, ' ') : 'the agent'}</span>
      </span>
      <button
        type="button"
        className="shrink-0 rounded-md px-1.5 py-0.5 font-medium text-on-surface-variant hover:bg-on-surface/8"
        onClick={() => {
          p.close?.()
          open({ kind: 'sources', turnId: p.turnId!, n: s.n })
        }}
      >
        Show in sources
      </button>
    </div>
  )
}

function Loading({ p }: { p: PreviewProps }) {
  return (
    <>
      <Head p={p} title={p.label} meta={kindName(p.kind)} />
      <div className="mt-3 space-y-2" aria-label="Loading">
        <span className="block h-3 w-2/3 animate-pulse-soft rounded-full bg-surface-container" />
        <span className="block h-3 w-1/2 animate-pulse-soft rounded-full bg-surface-container" />
      </div>
    </>
  )
}

function Gone({ p, error }: { p: PreviewProps; error: unknown }) {
  const gone = error instanceof ApiError && error.status === 404
  return (
    <>
      <Head p={p} title={p.label} meta={kindName(p.kind)} />
      <p className="mt-3 text-[13px] text-on-surface-variant">{gone ? `This ${kindName(p.kind).toLowerCase()} is gone.` : 'It could not be read. Try again.'}</p>
    </>
  )
}

/** The id in full, copied on a click. */
function IdLine({ id }: { id: string }) {
  const [copied, copy] = useCopy()
  const Icon = copied ? IconCheck : IconCopy
  return (
    <button type="button" title={copied ? 'Copied' : 'Copy id'} onClick={() => copy(id)} className="inline-flex max-w-full items-center gap-1 rounded-md font-mono text-[11.5px] text-outline hover:text-on-surface-variant">
      <span className="truncate">{id}</span>
      <Icon width={13} height={13} className="shrink-0" />
    </button>
  )
}

function Facts({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="mt-3 grid grid-cols-[88px_1fr] gap-x-3 gap-y-2 rounded-[14px] bg-surface-container-low p-3 text-[13px]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-outline">{k}</dt>
          <dd className="min-w-0 truncate text-on-surface">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

function TicketPreview(p: PreviewProps) {
  const q = useTicket(p.id)
  const commands = useTicketCommands(p.id)
  const [text, setText] = useState('')
  const [failed, setFailed] = useState<string>()
  const now = useNow(false)
  if (!q.data) return q.isError ? <Gone p={p} error={q.error} /> : <Loading p={p} />
  const d = q.data
  const { ticket: t, person, last_from, last_message_at } = d.ticket
  const waiting =
    t.status === 'resolved' ? (
      <Tag tone={quiet}>Resolved</Tag>
    ) : last_from === 'person' ? (
      <Tag>
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        Waiting on us · {duration(Math.max(0, now - Date.parse(last_message_at)))}
      </Tag>
    ) : (
      <Tag tone={quiet}>Waiting on customer</Tag>
    )
  // The last three messages, oldest first.
  const messages = [...d.messages.items].sort((a, b) => a.message.created_at.localeCompare(b.message.created_at)).slice(p.wide ? -8 : -3)
  const canReply = t.status === 'open' && !person.deleted
  function send(e: FormEvent) {
    e.preventDefault()
    const body = text.trim()
    if (!body || commands.reply.isPending) return
    setFailed(undefined)
    commands.reply.mutate({ body }, { onSuccess: () => setText(''), onError: (err) => setFailed(failureText(err)) })
  }
  return (
    <>
      <Head p={p} title={ticketTitle(t, d.messages.items.find((m) => m.message.id === t.first_message_id)?.message.text)} meta={`Ticket · opened ${when(t.opened_at)}`} />
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[12.5px]">
        {waiting}
        <span className="text-outline">from</span>
        <span className="inline-flex min-w-0 items-center gap-1.5 text-on-surface">
          <Initial name={person.display_name || '?'} id={person.id} size={18} status={d.person_status} />
          <PersonName p={person} />
        </span>
      </div>
      {messages.length > 0 && (
        <div className="mt-3 space-y-2 rounded-[14px] bg-surface-container-low p-2.5">
          {messages.map(({ message: m, member }) => {
            const mine = m.sender_id === shopNexusId
            const words = m.text || (m.photos.length ? count(m.photos.length, 'photo') : '')
            return (
              <div key={m.id} className={mine ? 'flex flex-col items-end' : 'flex flex-col items-start'}>
                <p
                  className={`max-w-[85%] whitespace-pre-wrap break-words px-3 py-1.5 text-[13px] leading-[19px] ${p.wide ? '' : 'line-clamp-3'} ${mine ? 'rounded-[14px] rounded-br-[5px] bg-primary text-on-primary' : 'rounded-[14px] rounded-bl-[5px] bg-surface-container-highest text-on-surface'}`}
                >
                  {words}
                </p>
                <p className="mt-0.5 text-[11px] text-outline">
                  {time(m.created_at)}
                  {mine && member ? ` · ${member}` : ''}
                </p>
              </div>
            )
          })}
        </div>
      )}
      {canReply && (
        <form onSubmit={send} className="mt-3 flex items-center gap-2 rounded-[14px] border border-hairline bg-surface-container-lowest py-1 pl-3.5 pr-1 focus-within:border-primary/50">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Reply to this customer…"
            aria-label="Reply"
            className="min-w-0 flex-1 bg-transparent py-1.5 text-[13.5px] text-on-surface outline-none placeholder:text-outline"
          />
          <button
            type="submit"
            title="Send reply"
            aria-label="Send reply"
            disabled={!text.trim() || commands.reply.isPending}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary transition-opacity disabled:bg-surface-container disabled:text-outline"
          >
            <IconSend width={17} height={17} />
          </button>
        </form>
      )}
      {failed && <p className="mt-1.5 text-[12px] text-on-surface-variant">{failed}</p>}
      <ReadIn p={p} />
    </>
  )
}

/** A person's name, "Deleted", or "No name" and the id's tail. */
function PersonName({ p }: { p: Person }) {
  if (p.deleted) return <span className="text-on-surface-variant">Deleted</span>
  if (p.display_name) return <span className="truncate">{p.display_name}</span>
  return (
    <span className="text-on-surface-variant">
      No name <span className="font-mono text-[11.5px] text-outline">{idTail(p.id)}</span>
    </span>
  )
}

function AccountPreview(p: PreviewProps) {
  const q = useAccountDetail(p.id)
  if (!q.data) return q.isError ? <Gone p={p} error={q.error} /> : <Loading p={p} />
  const a = q.data.account
  const name = a.display_name || 'No display name'
  return (
    <>
      <Head p={p} title={name} meta="Account" lead={<Initial name={a.display_name || '?'} id={a.id} size={40} status={a.status} />} />
      <div className="mt-1 pl-[50px]">
        <IdLine id={a.id} />
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {a.status === 'suspended' ? <Tag tone={quiet}>Suspended{a.suspended_until ? ` until ${date(a.suspended_until)}` : ''}</Tag> : <Tag>Active</Tag>}
        <Tag tone={quiet}>Joined {day(a.created_at)}</Tag>
      </div>
      {a.status === 'suspended' && a.suspend_reason && (
        <p className="mt-2.5 border-l-2 border-outline-variant pl-3 text-[13px] leading-5 text-on-surface-variant">{a.suspend_reason}</p>
      )}
      <ReadIn p={p} />
    </>
  )
}

function ListingPreview(p: PreviewProps) {
  const q = useListing(p.id)
  if (!q.data) return q.isError ? <Gone p={p} error={q.error} /> : <Loading p={p} />
  const l = q.data
  const photo = l.photo_urls?.[0]
  return (
    <>
      <Head
        p={p}
        title={l.title}
        meta={`${vnd(l.price)} · ${listingStatus[l.status] ?? humanize(l.status)}`}
        lead={photo ? <img src={photo} alt="" className="h-10 w-10 shrink-0 rounded-[10px] object-cover" /> : undefined}
      />
      <Facts
        rows={[
          ['Seller', personRow(l.seller.display_name, l.seller.id, l.seller.status)],
          ['Item', `${l.category} · ${conditionLabel[l.condition] ?? humanize(l.condition)}`],
          ['Where', `${l.commune}, ${l.province}`],
          ...(l.reports?.length ? ([['Reports', count(l.reports.length, 'report')]] as [string, ReactNode][]) : []),
          ...(l.hidden ? ([['Hidden', `by ${l.hidden.by_member_name}, ${when(l.hidden.at)}`]] as [string, ReactNode][]) : []),
        ]}
      />
      <ReadIn p={p} />
    </>
  )
}

function personRow(name: string, id: string, status?: 'active' | 'suspended' | 'deleted') {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 align-middle">
      <Initial name={name || '?'} id={id} size={18} status={status} />
      <span className="truncate">{name || 'No name'}</span>
    </span>
  )
}

function OrderPreview(p: PreviewProps) {
  const q = useOrder(p.id)
  if (!q.data) return q.isError ? <Gone p={p} error={q.error} /> : <Loading p={p} />
  const o = q.data
  const photo = o.listing.photo_url
  return (
    <>
      <Head
        p={p}
        title={`Order ${o.code}`}
        meta={`${vnd(o.price)} · ${orderStatus[o.status] ?? humanize(o.status)}`}
        lead={photo ? <img src={photo} alt="" className="h-10 w-10 shrink-0 rounded-[10px] object-cover" /> : undefined}
      />
      <Facts
        rows={[
          ['Listing', o.listing.title],
          ['Buyer', personRow(o.buyer.display_name, o.buyer.id, o.buyer.status)],
          ['Seller', personRow(o.seller.display_name, o.seller.id, o.seller.status)],
          ...(o.shipment ? ([['Shipment', `${o.shipment.carrier} · ${shipmentStatus[o.shipment.status] ?? humanize(o.shipment.status)}`]] as [string, ReactNode][]) : []),
          ...(o.tickets.length ? ([['Tickets', count(o.tickets.length, 'ticket')]] as [string, ReactNode][]) : []),
        ]}
      />
      <ReadIn p={p} />
    </>
  )
}

function ReportPreview(p: PreviewProps) {
  const q = useCase(p.id)
  if (!q.data) return q.isError ? <Gone p={p} error={q.error} /> : <Loading p={p} />
  const c = q.data
  const reasons = reasonsOf(c.reasons)
  return (
    <>
      <Head p={p} title={c.account.display_name || 'No display name'} meta={`Report case · ${count(c.reports.length, 'report')} · last ${when(c.last_at)}`} />
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {c.resolution ? <Tag tone={quiet}>{c.resolution.outcome === 'actioned' ? 'Actioned' : 'Dismissed'}</Tag> : <Tag>Open</Tag>}
        {reasons.map(([r, n]) => (
          <Tag key={r} tone={quiet}>
            {reasonLabel[r]} {n}
          </Tag>
        ))}
      </div>
      {c.reports[0]?.note && <p className="mt-2.5 line-clamp-3 border-l-2 border-primary pl-3 text-[13px] leading-5 text-on-surface-variant">{c.reports[0].note}</p>}
      <ReadIn p={p} />
    </>
  )
}

const previews: Record<RecordKind, (p: PreviewProps) => ReactNode> = {
  ticket: TicketPreview,
  account: AccountPreview,
  listing: ListingPreview,
  order: OrderPreview,
  report: ReportPreview,
}

/** A record's preview: a ticket's last messages and a reply box, an account's state, a listing's price and seller. */
export function RecordPreview(p: PreviewProps) {
  const View = previews[p.kind]
  return <View {...p} />
}
