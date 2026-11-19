import { type FormEvent, type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import IconOpen from '~icons/material-symbols-light/north-east-rounded'
import { shipmentStatus } from '../lib/commerce'
import IconBolt from '~icons/material-symbols/bolt-rounded'
import IconSend from '~icons/material-symbols-light/arrow-upward-rounded'
import IconCheck from '~icons/material-symbols-light/check-rounded'
import IconChevron from '~icons/material-symbols-light/chevron-right-rounded'
import IconClose from '~icons/material-symbols-light/close-rounded'
import IconFilter from '~icons/material-symbols-light/filter-list-rounded'
import IconSee from '~icons/material-symbols-light/visibility-outline'
import IconUndo from '~icons/material-symbols-light/undo-rounded'
import IconInfo from '~icons/material-symbols-light/info-outline-rounded'
import IconShip from '~icons/material-symbols-light/local-shipping-outline-rounded'
import IconSpark from '~icons/material-symbols/auto-awesome-outline-rounded'
import { RecordAgent } from '../components/chat/RecordAgent'
import { DotFact, JKHint, ListColumn, ListRow } from '../components/Panes'
import type { Attachment } from '../lib/agent'
import type { Command } from '../lib/commands'
import { Select } from '../components/Select'
import { Shell } from '../components/Shell'
import { Btn, Card, IconBtn, Initial, Kbd, Notice, Segmented } from '../components/ui'
import { shortId } from '../lib/api'
import { useListKeys } from '../lib/dom'
import { day, time, vnd, when } from '../lib/format'
import {
  type ConsoleMessage,
  type ConsoleTicket,
  type ConsoleTicketDetail,
  failureText,
  kindChip,
  kindLabel,
  personName,
  shopNexusId,
  type Ticket,
  type TicketKind,
  type TicketStatus,
  olderMessages,
  useOpenCount,
  useQueue,
  useTicket,
  useTicketCommands,
} from '../lib/support'

const noTickets: ConsoleTicket[] = []

const kindDot: Record<TicketKind, string> = { not_received: 'bg-primary', carrier_request: 'bg-on-surface-variant', other: 'bg-outline' }

/** The month an account joined, as "03/2025". */
function joined(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function dayLabel(iso: string): string {
  const w = when(iso)
  return /^\d/.test(w) ? 'Today' : w
}

function Queue({
  status,
  kind,
  active,
  onStatus,
  onKind,
}: {
  status: TicketStatus
  kind: TicketKind | null
  active?: string
  onStatus: (s: TicketStatus) => void
  onKind: (k: TicketKind | null) => void
}) {
  const queue = useQueue(status, kind)
  const open = useOpenCount()
  const navigate = useNavigate()
  return (
    <ListColumn
      head={
        <>
          <Segmented
            full
            label="Tickets"
            value={status}
            onChange={onStatus}
            items={[
              { value: 'open', label: `Open${open.data?.open !== undefined ? ` · ${open.data.open}` : ''}` },
              { value: 'resolved', label: 'Resolved' },
            ]}
          />
          <Select
            label="Kind"
            value={kind ?? 'all'}
            onChange={(v) => onKind(v === 'all' ? null : (v as TicketKind))}
            className="rounded-full px-4"
            leading={<IconFilter width={17} height={17} className="text-on-surface-variant" />}
            options={[{ value: 'all', label: 'All kinds' }, ...(Object.keys(kindChip) as TicketKind[]).map((k) => ({ value: k, label: kindChip[k] }))]}
          />
        </>
      }
      foot={<JKHint />}
    >
      <div key={`${status}-${kind}`} className="rise-list space-y-1">
        {queue.items?.map((t) => (
          <ListRow
            key={t.ticket.id}
            on={t.ticket.id === active}
            onClick={() => navigate(`/support/${t.ticket.id}`)}
            avatar={<Initial name={t.person.display_name} id={t.person.id} size={38} />}
            name={personName(t.person)}
            when={when(t.last_message_at)}
            line={
              /* The last line is what the person or ShopNexus wrote. */
              <span className={t.last_from === 'person' && status === 'open' ? 'text-on-surface' : ''}>
                {t.ticket.carrier_name ? `${t.ticket.carrier_name} · ` : ''}
                {t.last_text}
              </span>
            }
            foot={<DotFact tone={kindDot[t.ticket.kind]}>{kindLabel[t.ticket.kind]}</DotFact>}
          />
        ))}
        {queue.items && queue.items.length === 0 && <p className="px-3 py-6 text-body-medium text-on-surface-variant">No tickets.</p>}
        {queue.hasNextPage && (
          <button
            onClick={() => queue.fetchNextPage()}
            disabled={queue.isFetchingNextPage}
            className="h-9 w-full rounded-full text-label-medium text-primary hover:bg-on-surface/5 disabled:opacity-60"
          >
            More
          </button>
        )}
      </div>
    </ListColumn>
  )
}

const personStatus = { active: 'Active', suspended: 'Suspended', deleted: 'Deleted' }
function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-3 py-1 text-body-small">
      <span className="shrink-0 text-on-surface-variant">{label}</span>
      <span className="min-w-0 text-right">{children}</span>
    </div>
  )
}

/** Details: the person on a hero, the order, a carrier request, and the person's other tickets. */
function Details({ d }: { d: ConsoleTicketDetail }) {
  const navigate = useNavigate()
  const p = d.ticket.person
  const suspended = d.person_status === 'suspended'
  return (
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 pb-3">
      <section className={`relative overflow-hidden rounded-4xl border border-hairline p-4 band`}>
        <div aria-hidden className="dots pointer-events-none absolute inset-0" />
        <div className="relative flex items-center gap-3">
          <Initial name={p.display_name} id={p.id} size={44} status={d.person_status} />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-title-small">{personName(p)}</p>
            <p className="tabular-nums text-label-small font-normal text-on-surface-variant">
              {shortId(p.id)} · since {joined(d.joined_at)}
            </p>
          </div>
        </div>
        <p className="relative mt-3 inline-flex h-6 items-center gap-1.5 rounded-full border border-hairline bg-surface-container-lowest px-2.5 text-label-small">
          <span className={`h-1.5 w-1.5 rounded-full ${suspended ? 'bg-error' : 'bg-primary'}`} />
          {personStatus[d.person_status]}
        </p>
      </section>
      {d.order && (
        <Card className="p-4">
          <Link to={`/orders/${d.order.id}`} className="group flex items-center gap-1">
            <span className="min-w-0 truncate text-title-small group-hover:underline">{d.order.title}</span>
            <IconOpen width={14} height={14} className="shrink-0 text-primary" />
          </Link>
          <p className="tabular-nums text-body-small font-medium text-on-surface">
            {vnd(d.order.price)} <span className="text-on-surface-variant">· COD with inspection</span>
          </p>
          <div className="mt-3">
            <Fact label="Seller">
              <Link to={`/accounts/${d.order.seller.id}`} className="hover:underline">
                {d.order.seller.display_name}
              </Link>{' '}
              <span className="tabular-nums text-on-surface-variant">{shortId(d.order.seller.id)}</span>
            </Fact>
            {d.order.carrier && (
              <Fact label={d.order.carrier.toUpperCase()}>
                <span className="tabular-nums">{d.order.tracking_code}</span>
              </Fact>
            )}
            {d.order.shipment_status && (
              <Fact label="Carrier says">
                {shipmentStatus[d.order.shipment_status] ?? d.order.shipment_status}
                {d.order.delivered_at && ` · ${when(d.order.delivered_at)}`}
              </Fact>
            )}
          </div>
        </Card>
      )}
      {d.ticket.ticket.kind === 'carrier_request' && (
        <Card className="p-4">
          <Fact label="Carrier">{d.ticket.ticket.carrier_name}</Fact>
          <Fact label="Asked for it">{d.same_carrier_30d ?? 0} sellers in 30 days</Fact>
        </Card>
      )}
      {d.others.length > 0 && (
        <Card className="p-2">
          <p className="px-2 pb-1 pt-1 text-label-small text-on-surface-variant">Other tickets</p>
          {d.others.map((o: Ticket) => (
            <button
              key={o.id}
              onClick={() => navigate(`/support/${o.id}`)}
              className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left hover:bg-surface-container-low"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${kindDot[o.kind]}`} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body-medium">{kindLabel[o.kind]}</span>
                <span className="block text-label-small font-normal text-on-surface-variant">{when(o.opened_at)}</span>
              </span>
              <span className={`text-label-small ${o.status === 'resolved' ? 'text-primary' : 'text-on-surface-variant'}`}>
                {o.status === 'resolved' ? 'Resolved' : 'Open'}
              </span>
              <IconChevron width={16} height={16} className="text-outline" />
            </button>
          ))}
        </Card>
      )}
    </div>
  )
}

/** A reply being written: by hand, or the agent's answer put there from a tab. An answer that arrives over a reply written by hand waits as offered. */
export interface ReplyDraft {
  text: string
  fromAgent?: boolean
  offered?: string
}

const maxReply = 1000

/** The person's chat with ShopNexus, oldest first, with the reply box under it. */
function CustomerChat({ d, reply, onReply, onFailure }: { d: ConsoleTicketDetail; reply: ReplyDraft; onReply: (r: ReplyDraft) => void; onFailure?: (e: unknown) => void }) {
  const t = d.ticket.ticket
  const commands = useTicketCommands(t.id)
  const text = reply.text
  const setText = (v: string) => onReply({ ...reply, text: v, fromAgent: reply.fromAgent && v !== '' })
  const over = text.length > maxReply
  // The detail carries the newest page; "Older messages" reads the ones before it.
  const [older, setOlder] = useState<{ items: ConsoleMessage[]; cursor?: string }>({ items: [], cursor: d.messages.next_cursor })
  const [reading, setReading] = useState(false)
  const name = personName(d.ticket.person)
  async function readOlder() {
    if (!older.cursor || reading) return
    setReading(true)
    try {
      const p = await olderMessages(t.id, older.cursor)
      setOlder((o) => ({ items: [...o.items, ...p.items], cursor: p.next_cursor }))
    } finally {
      setReading(false)
    }
  }
  // A reply moves the newest page; a message read twice shows once.
  const seen = new Set(d.messages.items.map((m) => m.message.id))
  const messages = [...d.messages.items, ...older.items.filter((m) => !seen.has(m.message.id))]
  // Oldest first, with the ticket's events between the messages.
  const items: ({ at: string } & ({ m: ConsoleMessage } | { e: Ticket['events'][number] }))[] = [
    ...messages.map((m) => ({ at: m.message.created_at, m })),
    ...t.events.filter((e) => e.kind !== 'opened').map((e) => ({ at: e.at, e })),
  ].sort((a, b) => a.at.localeCompare(b.at))
  const days = items.map((it, i) => {
    const label = dayLabel(it.at)
    return i === 0 || dayLabel(items[i - 1].at) !== label ? label : null
  })
  // The thread stays at its newest line as messages arrive.
  const end = useRef<HTMLDivElement>(null)
  const newest = items.at(-1)?.at
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' })
  }, [newest])

  function send(e?: FormEvent) {
    e?.preventDefault()
    const body = text.trim()
    if (!body || over || commands.reply.isPending) return
    commands.reply.mutate(body, { onSuccess: () => onReply({ text: '' }), onError: onFailure })
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-6 py-5">
        {older.cursor && (
          <button onClick={readOlder} disabled={reading} className="mx-auto h-8 rounded-full px-4 text-label-medium text-primary hover:bg-on-surface/5 disabled:opacity-60">
            Older messages
          </button>
        )}
        <span className="flex-1" />
        {items.map((it, i) => {
          const label = days[i] ? <p className="py-1 text-center text-label-small font-normal text-on-surface-variant">{days[i]}</p> : null
          if ('e' in it) {
            return (
              <div key={i}>
                {label}
                <p className="flex items-center justify-center gap-1.5 py-1 text-label-small font-normal text-on-surface-variant">
                  {it.e.kind === 'resolved' ? <IconCheck width={15} height={15} /> : <IconUndo width={15} height={15} />}
                  {it.e.kind === 'resolved' ? 'Resolved' : 'Reopened'}
                </p>
              </div>
            )
          }
          const m = it.m.message
          const mine = m.sender_id === shopNexusId
          const first = m.id === t.first_message_id
          return (
            <div key={m.id}>
              {label}
              {/* Messages stay as the person and the members wrote them. */}
              <div className={`max-w-[72%] ${mine ? 'ml-auto' : ''}`}>
                <div
                  className={`whitespace-pre-wrap rounded-[20px] px-4 py-2.5 text-body-medium ${
                    mine ? 'rounded-br-[6px] bg-primary/10' : 'rounded-bl-[6px] bg-surface-container-low'
                  }`}
                >
                  {first && (
                    <p className="mb-1 text-label-small text-primary">
                      {kindLabel[t.kind]}
                      {t.order ? ` · ${t.order.title}` : ''}
                      {t.carrier_name ? ` · ${t.carrier_name}` : ''}
                    </p>
                  )}
                  {m.reply_to && (
                    <span className="mb-1.5 flex gap-2 rounded-lg bg-surface-container-low px-2 py-1.5">
                      <span className="w-[3px] shrink-0 rounded-full bg-primary" />
                      <span className="line-clamp-2 text-label-small font-normal text-on-surface-variant">{m.reply_to.text}</span>
                    </span>
                  )}
                  {m.text}
                </div>
                <p className={`mt-1 flex items-center gap-1 px-1 tabular-nums text-label-small font-normal text-on-surface-variant ${mine ? 'justify-end' : ''}`}>
                  {it.m.automatic && <IconBolt width={13} height={13} />}
                  {it.m.automatic ? 'Sent on close · ' : it.m.member ? `${it.m.member} · ` : ''}
                  {time(m.created_at)}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={end} />
      </div>
      <form onSubmit={send} data-reply-box className="px-6 pb-5">
        <div className="overflow-hidden rounded-5xl border border-hairline bg-surface-container-lowest shadow-soft focus-within:border-primary/40 focus-within:ring-4 focus-within:ring-primary/10">
          {reply.offered && (
            <p className="flex items-center gap-1.5 bg-primary/6 px-4 py-2 text-label-small text-primary">
              <IconSpark width={14} height={14} />
              The agent wrote a reply
              <span className="flex-1" />
              <button type="button" onClick={() => onReply({ text: reply.offered ?? '', fromAgent: true })} className="rounded-full px-2 py-0.5 hover:bg-on-surface/5">
                Use it
              </button>
              <button type="button" onClick={() => onReply({ ...reply, offered: undefined })} className="rounded-full px-2 py-0.5 font-normal text-on-surface-variant hover:bg-on-surface/5">
                Keep mine
              </button>
            </p>
          )}
          {reply.fromAgent && (
            <p className="flex items-center gap-1.5 px-4 pt-3 text-label-small text-primary">
              <IconSpark width={14} height={14} />
              From the agent
              <span className="flex-1" />
              <button type="button" onClick={() => onReply({ text: '' })} className="rounded-full px-2 py-0.5 font-normal text-on-surface-variant hover:bg-on-surface/5">
                Discard
              </button>
            </p>
          )}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send()
            }}
            rows={2}
            aria-invalid={over}
            placeholder={`Reply to ${name}…`}
            className="field-sizing-content block max-h-[220px] min-h-[52px] w-full resize-none bg-transparent px-4 pt-3 text-body-medium outline-none placeholder:text-on-surface-variant/80"
          />
          <div className="flex items-center gap-2 px-3 pb-2.5">
            <span className="flex items-center gap-1 text-label-small font-normal text-on-surface-variant">
              <IconSee width={14} height={14} />
              Shown as ShopNexus
            </span>
            <span className="flex-1" />
            {over ? (
              <span role="alert" className="text-label-small font-normal text-error">
                {text.length}/{maxReply}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-label-small font-normal text-on-surface-variant">
                <Kbd>Ctrl ↵</Kbd>Send
              </span>
            )}
            <button
              type="submit"
              title="Send (Ctrl+Enter)"
              disabled={!text.trim() || over || commands.reply.isPending}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-on-primary disabled:opacity-40"
            >
              <IconSend width={17} height={17} />
            </button>
          </div>
        </div>
      </form>
    </>
  )
}

/** The order and its shipment, above the customer's chat. */
function Facts({ d }: { d: ConsoleTicketDetail }) {
  const o = d.order
  if (!o) return null
  const cell = 'flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl border border-hairline bg-surface-container-lowest px-3 py-2'
  return (
    <div className="flex shrink-0 gap-2 border-b border-hairline px-6 py-3">
      <Link to={`/orders/${o.id}`} className={`${cell} hover:border-primary/30`}>
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-label-medium">{o.title}</span>
          <span className="block truncate tabular-nums text-label-small font-normal text-on-surface-variant">{vnd(o.price)} · COD with inspection</span>
        </span>
      </Link>
      {o.carrier && (
        <div className={cell}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary">
            <IconShip width={18} height={18} />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-label-medium">
              {o.shipment_status ? (shipmentStatus[o.shipment_status] ?? o.shipment_status) : 'No carrier event'}
              {o.delivered_at && ` · ${when(o.delivered_at)}`}
            </span>
            <span className="block truncate tabular-nums text-label-small font-normal text-on-surface-variant">
              {o.carrier.toUpperCase()} · {o.tracking_code}
            </span>
          </span>
        </div>
      )}
    </div>
  )
}

/** The records of a ticket a chat can mention: the person, the order and its seller. */
function ticketRecords(d: ConsoleTicketDetail): Attachment[] {
  const p = d.ticket.person
  const o = d.order
  return [
    { kind: 'account', id: p.id, label: `Account · ${personName(p)}` },
    ...(o ? [{ kind: 'order' as const, id: o.id, label: `Order · ${o.title}` }, { kind: 'account' as const, id: o.seller.id, label: `Seller · ${o.seller.display_name}` }] : []),
  ]
}

/** What a new tab offers to ask about the ticket. */
function startersOf(d: ConsoleTicketDetail): string[] {
  const name = personName(d.ticket.person)
  const o = d.order
  return [
    ...(o?.carrier ? [`Did ${o.carrier.toUpperCase()} really deliver it?`] : []),
    `What should I tell ${name}?`,
    ...(o ? [`Has ${o.seller.display_name} had tickets like this before?`] : []),
    'Summarize this ticket',
  ]
}

function Panel({ id }: { id: string }) {
  const navigate = useNavigate()
  const detail = useTicket(id)
  const commands = useTicketCommands(id)
  const [replyError, setReplyError] = useState<unknown>(null)
  const [info, setInfo] = useState(false)
  const [reply, setReply] = useState<ReplyDraft>({ text: '' })
  // An answer goes in the box unless the member is writing one there by hand.
  const putReply = useCallback((text: string) => setReply((r) => (r.text.trim() && !r.fromAgent ? { ...r, offered: text } : { text, fromAgent: true })), [])

  // Ctrl / moves between the reply box and the agent's box.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!e.ctrlKey || e.key !== '/') return
      e.preventDefault()
      const inReply = (e.target as HTMLElement).closest('[data-reply-box]')
      document.querySelector<HTMLTextAreaElement>(inReply ? '[data-agent-panel] textarea' : '[data-reply-box] textarea')?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!detail.data) {
    return <section className="flex flex-1 items-center justify-center">{detail.isError && <Notice>This ticket did not load.</Notice>}</section>
  }
  const failure = replyError ?? commands.resolve.error ?? commands.reopen.error
  const d = detail.data
  const t = d.ticket.ticket
  const p = d.ticket.person
  const name = personName(p)
  const resolved = [...t.events].reverse().find((e) => e.kind === 'resolved')
  const ticketCommands: Command[] = [
    {
      name: 'reply',
      arg: 'how',
      description: `Draft a reply to ${name} into the reply box`,
      run: (how, chat) =>
        chat.ask(`Write the reply to send to ${name} in this ticket, in Vietnamese, as ShopNexus. Give only the message.${how ? ` ${how}` : ''}`, { toReply: true }),
    },
    { name: 'summary', description: 'The ticket so far, for a note or a handoff', run: (_, chat) => chat.ask(`Summarize this ticket so far for a handoff: what ${name} asked, what was done, what is left.`) },
  ]

  return (
    <section className="flex min-w-0 flex-1 animate-pane overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 px-6">
          <Initial name={p.display_name} id={p.id} size={38} status={d.person_status} />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-title-small">
              {name} · {kindLabel[t.kind].toLowerCase()}
            </p>
            <p className="truncate text-label-small font-normal text-on-surface-variant">
              {t.status === 'resolved' && resolved ? `Resolved ${when(resolved.at)}` : `Opened ${day(t.opened_at)} ${time(t.opened_at)}`}
              {d.others.length > 0 ? ` · ${d.others.length} other ticket${d.others.length > 1 ? 's' : ''}` : ''}
            </p>
          </div>
          {t.status === 'open' ? (
            <Btn kind="primary" icon={<IconCheck width={17} height={17} />} onClick={() => commands.resolve.mutate()} disabled={commands.resolve.isPending}>
              Resolve
            </Btn>
          ) : (
            <Btn icon={<IconUndo width={17} height={17} />} onClick={() => commands.reopen.mutate()} disabled={commands.reopen.isPending}>
              Reopen
            </Btn>
          )}
          <IconBtn title="Details" aria-pressed={info} onClick={() => setInfo((v) => !v)} className={info ? 'bg-primary/8 text-primary' : ''}>
            <IconInfo width={19} height={19} />
          </IconBtn>
          <IconBtn title="Close (Esc)" onClick={() => navigate('/support')}>
            <IconClose width={18} height={18} />
          </IconBtn>
        </header>
        {failure !== null && failure !== undefined && (
          <div className="px-6 pb-3">
            <Notice>{failureText(failure)}</Notice>
          </div>
        )}
        <Facts d={d} />
        <CustomerChat key={t.id} d={d} reply={reply} onReply={setReply} onFailure={setReplyError} />
      </div>
      <aside className="flex w-[420px] shrink-0 flex-col overflow-hidden border-l border-hairline bg-surface-container-low/50">
        {info ? (
          <>
            <p className="flex h-[53px] shrink-0 items-center border-b border-hairline px-4 text-title-small">Details</p>
            <div className="flex min-h-0 flex-1 flex-col pt-3">
              <Details d={d} />
            </div>
          </>
        ) : (
          <RecordAgent
            record={{ kind: 'ticket', id: t.id, label: `Ticket · ${name}` }}
            here={{ title: 'In this ticket', items: ticketRecords(d) }}
            starters={startersOf(d)}
            commands={ticketCommands}
            onReply={putReply}
          />
        )}
      </aside>
    </section>
  )
}

/** Support: the ticket queue, and the ticket in the URL beside it. */
export function Support() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<TicketStatus>('open')
  const [kind, setKind] = useState<TicketKind | null>(null)
  const queue = useQueue(status, kind)

  // j and k move through the queue, Enter opens the selection, Escape closes it.
  const isOpen = useCallback((t: ConsoleTicket) => t.ticket.id === id, [id])
  const open = useCallback((t: ConsoleTicket) => navigate(`/support/${t.ticket.id}`), [navigate])
  const close = useCallback(() => navigate('/support'), [navigate])
  useListKeys(queue.items ?? noTickets, isOpen, open, id ? close : undefined, true)

  return (
    <Shell railFirst>
      <Queue status={status} kind={kind} active={id} onStatus={setStatus} onKind={setKind} />
      {id ? <Panel key={id} id={id} /> : <section className="flex-1 bg-surface-container-low/40" />}
    </Shell>
  )
}

