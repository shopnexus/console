import { type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import IconBolt from '~icons/material-symbols/bolt-rounded'
import IconChat from '~icons/material-symbols/chat-outline-rounded'
import IconCheck from '~icons/material-symbols/check-rounded'
import IconCheckCircle from '~icons/material-symbols/check-circle-outline-rounded'
import IconChevron from '~icons/material-symbols/chevron-right-rounded'
import IconClose from '~icons/material-symbols/close-rounded'
import IconPackage from '~icons/material-symbols/package-2-outline-rounded'
import IconReply from '~icons/material-symbols/reply-rounded'
import IconSchedule from '~icons/material-symbols/schedule-outline-rounded'
import IconSend from '~icons/material-symbols/send-rounded'
import IconAgent from '~icons/material-symbols/support-agent-rounded'
import IconTruck from '~icons/material-symbols/local-shipping-outline-rounded'
import IconUndo from '~icons/material-symbols/undo-rounded'
import { Shell } from '../components/Shell'
import { Kbd, Notice } from '../components/ui'
import {
  type ConsoleMessage,
  type ConsoleTicket,
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

const kindIcon: Record<TicketKind, (size: number) => ReactNode> = {
  not_received: (s) => <IconPackage width={s} height={s} />,
  carrier_request: (s) => <IconTruck width={s} height={s} />,
  other: (s) => <IconChat width={s} height={s} />,
}

const kindTone: Record<TicketKind, string> = {
  not_received: 'bg-secondary-container text-on-secondary-container',
  carrier_request: 'bg-surface-container-highest text-on-surface-variant',
  other: 'bg-surface-container-high text-on-surface-variant',
}

const time = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' })
const date = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' })
const money = new Intl.NumberFormat('vi-VN')

function when(iso: string): string {
  const d = new Date(iso)
  return d.toDateString() === new Date().toDateString() ? time.format(d) : date.format(d)
}

/** The month an account joined, as "03/2025". */
function joined(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function dayLabel(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Hôm nay'
  if (d.toDateString() === yesterday.toDateString()) return 'Hôm qua'
  return date.format(d)
}

function KindBadge({ kind, size = 40 }: { kind: TicketKind; size?: number }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full ${kindTone[kind]}`}
      style={{ width: size, height: size }}
    >
      {kindIcon[kind](size / 2)}
    </span>
  )
}

function StatusChip({ status }: { status: TicketStatus }) {
  return status === 'open' ? (
    <span className="inline-flex items-center gap-1 rounded-sm bg-secondary-container px-2 py-0.5 text-label-medium text-on-secondary-container">
      <IconSchedule width={14} height={14} />
      Đang mở
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-sm bg-surface-container-high px-2 py-0.5 text-label-medium text-primary">
      <IconCheckCircle width={14} height={14} />
      Đã xử lý
    </span>
  )
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
  const segment = (s: TicketStatus, label: string, n?: number) => (
    <button
      onClick={() => onStatus(s)}
      className={`state-layer flex h-10 flex-1 items-center justify-center gap-2 text-label-large first:rounded-l-full last:rounded-r-full last:border-l last:border-outline ${
        s === status ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface'
      }`}
    >
      {s === status && <IconCheck width={18} height={18} />}
      {label}
      {n !== undefined && ` · ${n}`}
    </button>
  )
  const chip = (k: TicketKind | null, label: string) => (
    <button
      key={k ?? 'all'}
      onClick={() => onKind(k)}
      className={`state-layer inline-flex h-8 items-center gap-1 rounded-sm px-3 text-label-large ${
        k === kind ? 'bg-secondary-container text-on-secondary-container' : 'border border-outline-variant text-on-surface-variant'
      }`}
    >
      {k === kind && <IconCheck width={18} height={18} />}
      {label}
    </button>
  )
  return (
    <section className="flex w-[360px] shrink-0 flex-col overflow-hidden rounded-xl bg-surface-container-lowest">
      <div className="space-y-3 p-4 pb-2">
        <div className="flex rounded-full border border-outline">
          {segment('open', 'Đang mở', open.data?.open)}
          {segment('resolved', 'Đã xử lý')}
        </div>
        <div className="flex flex-wrap gap-2">
          {chip(null, 'Tất cả')}
          {(Object.keys(kindChip) as TicketKind[]).map((k) => chip(k, kindChip[k]))}
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-2">
        {queue.items?.map((t) => <QueueRow key={t.ticket.id} t={t} on={t.ticket.id === active} status={status} />)}
        {queue.items && queue.items.length === 0 && (
          <p className="px-3 py-6 text-body-medium text-on-surface-variant">Không có ticket nào.</p>
        )}
        {queue.hasNextPage && (
          <button
            onClick={() => queue.fetchNextPage()}
            disabled={queue.isFetchingNextPage}
            className="state-layer h-10 w-full rounded-full text-label-large text-primary disabled:opacity-60"
          >
            Xem thêm
          </button>
        )}
      </div>
      <p className="flex items-center gap-2 border-t border-outline-variant px-4 py-3 text-body-small text-on-surface-variant">
        <Kbd>j</Kbd>
        <Kbd>k</Kbd>
        Ticket trước, sau
      </p>
    </section>
  )
}

function QueueRow({ t, on, status }: { t: ConsoleTicket; on: boolean; status: TicketStatus }) {
  const navigate = useNavigate()
  const waiting = t.last_from === 'person' && status === 'open'
  return (
    <button
      data-ticket={t.ticket.id}
      onClick={() => navigate(`/support/${t.ticket.id}`)}
      className={`state-layer flex w-full gap-3 rounded-lg px-3 py-3 text-left ${on ? 'bg-secondary-container' : ''}`}
    >
      <KindBadge kind={t.ticket.kind} />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="min-w-0 flex-1 truncate text-title-small">{t.person.display_name}</span>
          <span className="shrink-0 text-body-small text-on-surface-variant">{when(t.last_message_at)}</span>
        </span>
        <span className="block text-body-small text-on-surface-variant">
          {kindLabel[t.ticket.kind]} · <span className="font-mono">{t.person.id.slice(0, 8)}</span>
        </span>
        <span className={`mt-0.5 block truncate text-body-medium ${waiting ? 'text-on-surface' : 'text-on-surface-variant'}`}>
          {t.ticket.carrier_name ? `${t.ticket.carrier_name} · ` : ''}
          {t.last_text}
        </span>
        {waiting && (
          <span className="mt-1 inline-flex items-center gap-1 text-label-medium text-primary">
            <IconReply width={16} height={16} />
            Chờ trả lời
          </span>
        )}
      </span>
    </button>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="py-1">
      <p className="text-body-small text-on-surface-variant">{label}</p>
      <div className="text-body-medium">{children}</div>
    </div>
  )
}

function SideCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg bg-surface-container-low p-4">
      <h3 className="mb-1 text-title-small text-on-surface-variant">{title}</h3>
      {children}
    </section>
  )
}

const personStatus = { active: 'Hoạt động', suspended: 'Tạm khoá', deleted: 'Đã xoá' }
const shipmentStatus: Record<string, string> = {
  pending_pickup: 'Chờ lấy hàng',
  in_transit: 'Đang giao',
  delivered: 'Đã giao',
  failed: 'Giao không thành',
}

function Facts({ d }: { d: ConsoleTicketDetail }) {
  const navigate = useNavigate()
  const p = d.ticket.person
  return (
    <aside className="w-[272px] shrink-0 space-y-3 overflow-y-auto border-l border-outline-variant p-3">
      <SideCard title="Người gửi">
        <div className="mb-1 flex items-center gap-3 py-1.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-high text-title-small text-on-surface-variant">
            {p.display_name.trim()[0] ?? '?'}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-title-small">{p.display_name || 'Đã xoá'}</span>
            <span className="block font-mono text-body-small text-on-surface-variant">{p.id.slice(0, 8)}</span>
          </span>
        </div>
        <Fact label="Trạng thái">
          <span className="rounded-sm bg-secondary-container px-2 py-0.5 text-label-medium text-on-secondary-container">
            {personStatus[d.person_status]}
          </span>
        </Fact>
        <Fact label="Tham gia">{joined(d.joined_at)}</Fact>
      </SideCard>
      {d.order && (
        <SideCard title="Đơn liên quan">
          <p className="text-title-small">{d.order.title}</p>
          <Fact label="Giá chốt">
            <span className="text-tertiary">{money.format(d.order.price)} ₫</span>
          </Fact>
          <Fact label="Người bán">
            {d.order.seller.display_name}{' '}
            <span className="font-mono text-body-small text-on-surface-variant">{d.order.seller.id.slice(0, 8)}</span>
          </Fact>
          {d.order.carrier && (
            <Fact label={d.order.carrier.toUpperCase()}>
              <span className="font-mono">{d.order.tracking_code}</span>
            </Fact>
          )}
          {d.order.shipment_status && (
            <Fact label="Hãng báo">
              {shipmentStatus[d.order.shipment_status] ?? d.order.shipment_status}
              {d.order.delivered_at && ` · ${when(d.order.delivered_at)}`}
            </Fact>
          )}
        </SideCard>
      )}
      {d.ticket.ticket.kind === 'carrier_request' && (
        <SideCard title="Yêu cầu">
          <Fact label="Hãng">{d.ticket.ticket.carrier_name}</Fact>
          <Fact label="Cùng xin hãng này">{d.same_carrier_30d ?? 0} người bán trong 30 ngày</Fact>
        </SideCard>
      )}
      {d.others.length > 0 && (
        <SideCard title="Ticket khác của người này">
          {d.others.map((o: Ticket) => (
            <button
              key={o.id}
              onClick={() => navigate(`/support/${o.id}`)}
              className="state-layer -mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-md px-2 py-2 text-left"
            >
              <KindBadge kind={o.kind} size={32} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body-medium">{kindLabel[o.kind]}</span>
                <span className="block text-body-small text-on-surface-variant">{when(o.opened_at)}</span>
              </span>
              <span className={`text-label-medium ${o.status === 'resolved' ? 'text-primary' : 'text-on-surface-variant'}`}>
                {o.status === 'resolved' ? 'Đã xử lý' : 'Đang mở'}
              </span>
              <IconChevron width={16} height={16} className="text-outline" />
            </button>
          ))}
        </SideCard>
      )}
    </aside>
  )
}

function Thread({ d }: { d: ConsoleTicketDetail }) {
  const t = d.ticket.ticket
  // The detail carries the newest page; "Xem tin cũ hơn" reads the ones before it.
  const [older, setOlder] = useState<{ items: ConsoleMessage[]; cursor?: string }>({ items: [], cursor: d.messages.next_cursor })
  const [reading, setReading] = useState(false)
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
  // A day label sits above the first item of each day.
  const days = items.map((it, i) => {
    const day = dayLabel(it.at)
    return i === 0 || dayLabel(items[i - 1].at) !== day ? day : null
  })
  // The thread stays at its newest line as messages arrive.
  const end = useRef<HTMLDivElement>(null)
  const newest = items.at(-1)?.at
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' })
  }, [newest])
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-5 py-4">
      {older.cursor && (
        <button
          onClick={readOlder}
          disabled={reading}
          className="state-layer mx-auto h-8 rounded-full px-4 text-label-large text-primary disabled:opacity-60"
        >
          Xem tin cũ hơn
        </button>
      )}
      {items.map((it, i) => {
        const label = days[i] ? <p className="py-1 text-center text-label-medium text-on-surface-variant">{days[i]}</p> : null
        if ('e' in it) {
          return (
            <div key={i}>
              {label}
              <p className="flex items-center justify-center gap-1.5 py-1 text-label-medium text-on-surface-variant">
                {it.e.kind === 'resolved' ? <IconCheckCircle width={16} height={16} /> : <IconUndo width={16} height={16} />}
                {it.e.kind === 'resolved' ? 'Đã xử lý' : 'Mở lại'}
              </p>
            </div>
          )
        }
        const m = it.m.message
        const mine = m.sender_id === shopNexusId
        const card = m.id === t.first_message_id
        return (
          <div key={m.id}>
            {label}
            <div className={`flex flex-col gap-1 ${mine ? 'items-end' : 'items-start'}`}>
              {card ? (
                <article className="w-[90%] rounded-lg-plus rounded-bl-xs bg-surface-container p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-primary">{kindIcon[t.kind](20)}</span>
                    <span className="min-w-0 flex-1 truncate text-title-small">{kindLabel[t.kind]}</span>
                  </div>
                  {t.order && (
                    <div className="mt-3 rounded-md bg-surface-container-lowest px-3 py-2">
                      <p className="truncate text-title-small">{t.order.title}</p>
                      <p className="font-mono text-body-small text-on-surface-variant">
                        {t.order.carrier?.toUpperCase()} · {t.order.tracking_code}
                      </p>
                    </div>
                  )}
                  {t.carrier_name && <p className="mt-3 text-title-medium">{t.carrier_name}</p>}
                  {m.text && <p className="mt-2 text-body-medium">{m.text}</p>}
                </article>
              ) : (
                <p
                  className={`max-w-[80%] whitespace-pre-wrap rounded-lg-plus px-3 py-2 text-body-medium ${
                    mine ? 'bg-secondary-container text-on-surface' : 'bg-surface-container-high'
                  }`}
                >
                  {m.reply_to && (
                    <span className="mb-1.5 flex gap-2 rounded-md bg-surface-container-lowest px-2 py-1.5">
                      <span className="w-[3px] shrink-0 rounded-full bg-primary" />
                      <span className="line-clamp-2 text-body-small text-on-surface-variant">{m.reply_to.text}</span>
                    </span>
                  )}
                  {m.text}
                </p>
              )}
              <p className="flex items-center gap-1 px-2 text-body-small text-on-surface-variant">
                {it.m.automatic && <IconBolt width={14} height={14} />}
                {it.m.automatic ? 'Tự gửi khi đóng · ' : it.m.member ? `${it.m.member} · ` : ''}
                {time.format(new Date(m.created_at))}
              </p>
            </div>
          </div>
        )
      })}
      <div ref={end} />
    </div>
  )
}

function Panel({ id }: { id: string }) {
  const navigate = useNavigate()
  const detail = useTicket(id)
  const commands = useTicketCommands(id)
  const [text, setText] = useState('')
  if (!detail.data) {
    return (
      <section className="flex flex-1 items-center justify-center rounded-xl bg-surface-container-lowest">
        {detail.isError && <Notice>Không mở được ticket này.</Notice>}
      </section>
    )
  }
  const failure = commands.reply.error ?? commands.resolve.error ?? commands.reopen.error
  const d = detail.data
  const t = d.ticket.ticket
  const name = d.ticket.person.display_name || 'Đã xoá'
  const resolved = [...t.events].reverse().find((e) => e.kind === 'resolved')

  function send(e?: FormEvent) {
    e?.preventDefault()
    const body = text.trim()
    if (!body || commands.reply.isPending) return
    commands.reply.mutate(body, { onSuccess: () => setText('') })
  }

  return (
    <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl bg-surface-container-lowest">
      <header className="flex items-center gap-3 border-b border-outline-variant px-5 py-3">
        <KindBadge kind={t.kind} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-title-medium">{kindLabel[t.kind]}</h2>
            <StatusChip status={t.status} />
          </div>
          <p className="text-body-small text-on-surface-variant">
            {name} ·{' '}
            {t.status === 'resolved' && resolved ? `Đã xử lý ${when(resolved.at)}` : `Mở ${when(t.opened_at)}`}
          </p>
        </div>
        {t.status === 'open' ? (
          <button
            onClick={() => commands.resolve.mutate()}
            disabled={commands.resolve.isPending}
            className="state-layer inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-label-large text-on-primary disabled:opacity-60"
          >
            <IconCheck width={20} height={20} />
            Đã xử lý
          </button>
        ) : (
          <button
            onClick={() => commands.reopen.mutate()}
            disabled={commands.reopen.isPending}
            className="state-layer inline-flex h-10 items-center gap-2 rounded-full border border-outline px-5 text-label-large text-primary"
          >
            <IconUndo width={20} height={20} />
            Mở lại
          </button>
        )}
        <button
          title="Đóng (Esc)"
          onClick={() => navigate('/support')}
          className="state-layer flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant"
        >
          <IconClose width={20} height={20} />
        </button>
      </header>
      {failure && (
        <div className="px-5 pt-3">
          <Notice>{failureText(failure)}</Notice>
        </div>
      )}
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <Thread d={d} />
          <form onSubmit={send} className="border-t border-outline-variant p-3">
            <div className="flex items-end gap-2 rounded-xl bg-surface-container-high py-2 pl-4 pr-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send()
                }}
                rows={1}
                maxLength={1000}
                placeholder={`Trả lời ${name}`}
                className="min-h-10 flex-1 resize-none bg-transparent py-2 text-body-medium outline-none placeholder:text-on-surface-variant"
              />
              <button
                type="submit"
                title="Gửi (Ctrl+Enter)"
                disabled={!text.trim() || commands.reply.isPending}
                className="state-layer flex h-10 w-10 items-center justify-center rounded-full bg-primary text-on-primary disabled:opacity-60"
              >
                <IconSend width={20} height={20} />
              </button>
            </div>
            <p className="mt-2 flex items-center gap-1.5 px-1 text-body-small text-on-surface-variant">
              <IconAgent width={16} height={16} />
              Người dùng thấy tên ShopNexus
            </p>
          </form>
        </div>
        <Facts d={d} />
      </div>
    </section>
  )
}

/** Hỗ trợ: the ticket queue, and the ticket in the URL beside it. */
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
      if (target.closest('input, textarea, [contenteditable]')) return
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
    <Shell title="Hỗ trợ">
      <div className="flex h-[calc(100dvh-6rem)] min-h-[560px] gap-4">
        <Queue status={status} kind={kind} active={id} onStatus={setStatus} onKind={setKind} />
        {id ? <Panel key={id} id={id} /> : <section className="flex-1 rounded-xl bg-surface-container-lowest" />}
      </div>
    </Shell>
  )
}
