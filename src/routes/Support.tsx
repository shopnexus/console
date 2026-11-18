import { useQuery } from '@tanstack/react-query'
import { type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react'
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
import { ChatView } from '../components/chat/Chat'
import { DotFact, JKHint, ListColumn, ListRow } from '../components/Panes'
import { openConversation } from '../lib/agent'
import { Select } from '../components/Select'
import { Shell } from '../components/Shell'
import { Btn, Card, IconBtn, Initial, Notice, Segmented } from '../components/ui'
import { day, time, vnd, when } from '../lib/format'
import {
  type ConsoleMessage,
  type ConsoleTicketDetail,
  failureText,
  kindChip,
  kindLabel,
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
            name={t.person.display_name || 'Deleted'}
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
            <p className="truncate text-title-small">{p.display_name || 'Deleted'}</p>
            <p className="tabular-nums text-label-small font-normal text-on-surface-variant">
              {p.id.slice(0, 8)} · since {joined(d.joined_at)}
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
              <span className="tabular-nums text-on-surface-variant">{d.order.seller.id.slice(0, 8)}</span>
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

/** The person's chat with ShopNexus, oldest first, with its own box for a reply written by hand. */
function CustomerChat({ d, onFailure }: { d: ConsoleTicketDetail; onFailure?: (e: unknown) => void }) {
  const t = d.ticket.ticket
  const commands = useTicketCommands(t.id)
  const [text, setText] = useState('')
  // The detail carries the newest page; "Older messages" reads the ones before it.
  const [older, setOlder] = useState<{ items: ConsoleMessage[]; cursor?: string }>({ items: [], cursor: d.messages.next_cursor })
  const [reading, setReading] = useState(false)
  const name = d.ticket.person.display_name || 'Deleted'
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
    if (!body || commands.reply.isPending) return
    commands.reply.mutate(body, { onSuccess: () => setText(''), onError: onFailure })
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
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
              <div className={`max-w-[85%] ${mine ? 'ml-auto' : ''}`}>
                <div
                  className={`whitespace-pre-wrap rounded-[18px] px-3.5 py-2.5 text-body-small ${
                    mine ? 'rounded-br-[6px] bg-primary/10' : 'rounded-bl-[6px] bg-surface-container-lowest shadow-soft'
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
      <form onSubmit={send} className="px-3 pb-3">
        <div className="rounded-[18px] border border-hairline bg-surface-container-lowest shadow-soft focus-within:border-primary/40">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send()
            }}
            rows={2}
            maxLength={1000}
            placeholder={`Reply to ${name}…`}
            className="block w-full resize-none bg-transparent px-4 pt-3 text-body-small outline-none placeholder:text-on-surface-variant/80"
          />
          <div className="flex items-center gap-2 px-3 pb-2.5">
            <span className="flex items-center gap-1 text-label-small font-normal text-on-surface-variant">
              <IconSee width={14} height={14} />
              Shown as ShopNexus
            </span>
            <span className="flex-1" />
            <button
              type="submit"
              title="Send (Ctrl+Enter)"
              disabled={!text.trim() || commands.reply.isPending}
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

function Panel({ id }: { id: string }) {
  const navigate = useNavigate()
  const detail = useTicket(id)
  const commands = useTicketCommands(id)
  const [replyError, setReplyError] = useState<unknown>(null)
  const [side, setSide] = useState<'chat' | 'info'>('chat')
  if (!detail.data) {
    return <section className="flex flex-1 items-center justify-center">{detail.isError && <Notice>This ticket did not load.</Notice>}</section>
  }
  const failure = replyError ?? commands.resolve.error ?? commands.reopen.error
  const d = detail.data
  const t = d.ticket.ticket
  const p = d.ticket.person
  const resolved = [...t.events].reverse().find((e) => e.kind === 'resolved')
  const order = d.order

  return (
    <section className="flex min-w-0 flex-1 animate-pane overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-hairline px-6">
          <Initial name={p.display_name} id={p.id} size={38} status={d.person_status} />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-title-small">
              {p.display_name || 'Deleted'} · {kindLabel[t.kind].toLowerCase()}
            </p>
            <p className="truncate text-label-small font-normal text-on-surface-variant">
              {t.status === 'resolved' && resolved ? `Resolved ${when(resolved.at)}` : `Opened ${day(t.opened_at)} ${time(t.opened_at)}`}
              {order ? ` · ${order.title}` : ''}
              {order?.carrier ? ` · ${order.carrier.toUpperCase()}` : ''}
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
          <IconBtn title="Close (Esc)" onClick={() => navigate('/support')}>
            <IconClose width={18} height={18} />
          </IconBtn>
        </header>
        {failure !== null && failure !== undefined && (
          <div className="px-6 pt-3">
            <Notice>{failureText(failure)}</Notice>
          </div>
        )}
        <TicketAgent ticketId={t.id} label={`Ticket · ${p.display_name || 'Deleted'}`} />
      </div>
      <aside className="flex w-[340px] shrink-0 flex-col overflow-hidden border-l border-hairline bg-surface-container-low/50">
        <div className="p-3">
          <Segmented
            full
            label="Side"
            value={side}
            onChange={setSide}
            items={[
              { value: 'chat', label: 'Customer chat' },
              { value: 'info', label: 'Details' },
            ]}
          />
        </div>
        <div className="flex min-h-0 flex-1 flex-col">{side === 'chat' ? <CustomerChat key={t.id} d={d} onFailure={setReplyError} /> : <Details d={d} />}</div>
      </aside>
    </section>
  )
}

/** The agent's chat about the ticket: the ticket's shared conversation, opened (or made) on first view. */
function TicketAgent({ ticketId, label }: { ticketId: string; label: string }) {
  const conv = useQuery({ queryKey: ['agent', 'subject', 'ticket', ticketId], queryFn: () => openConversation({ kind: 'ticket', id: ticketId }), staleTime: Infinity })
  if (!conv.data) {
    return <div className="flex flex-1 items-center justify-center">{conv.isError && <Notice>The agent's chat did not open.</Notice>}</div>
  }
  return <ChatView key={conv.data.id} conversationId={conv.data.id} subject={{ kind: 'ticket', id: ticketId, label }} placeholder="Ask the agent or change the reply…" />
}

/** Support: the ticket queue, and the ticket in the URL beside it. */
export function Support() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<TicketStatus>('open')
  const [kind, setKind] = useState<TicketKind | null>(null)
  const queue = useQueue(status, kind)

  // j and k move through the queue, Enter opens the selection, Escape closes it.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (target.closest('input, textarea, select, [contenteditable]')) return
      const items = queue.items ?? []
      const at = items.findIndex((t) => t.ticket.id === id)
      if (e.key === 'j' || e.key === 'k') {
        const next = items[Math.min(items.length - 1, Math.max(0, at + (e.key === 'j' ? 1 : -1)))]
        if (next) navigate(`/support/${next.ticket.id}`)
      } else if (e.key === 'Enter' && at < 0 && items[0]) {
        navigate(`/support/${items[0].ticket.id}`)
      } else if (e.key === 'Escape' && id) {
        navigate('/support')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [queue.items, id, navigate])

  return (
    <Shell railFirst>
      <Queue status={status} kind={kind} active={id} onStatus={setStatus} onKind={setKind} />
      {id ? <Panel key={id} id={id} /> : <section className="flex-1 bg-surface-container-low/40" />}
    </Shell>
  )
}

