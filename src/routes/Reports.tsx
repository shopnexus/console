import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import IconSpark from '~icons/material-symbols/auto-awesome-outline-rounded'
import IconBlock from '~icons/material-symbols-light/block'
import IconCalendar from '~icons/material-symbols-light/calendar-today-outline-rounded'
import IconCheck from '~icons/material-symbols-light/check-rounded'
import IconCheckCircle from '~icons/material-symbols-light/check-circle-outline-rounded'
import IconChevron from '~icons/material-symbols-light/chevron-right-rounded'
import IconDown from '~icons/material-symbols-light/keyboard-arrow-down-rounded'
import IconUp from '~icons/material-symbols-light/keyboard-arrow-up-rounded'
import IconLock from '~icons/material-symbols-light/lock-outline'
import IconPhoto from '~icons/material-symbols-light/image-outline-rounded'
import IconUndo from '~icons/material-symbols-light/undo-rounded'
import IconSee from '~icons/material-symbols-light/visibility-outline'
import { Shell } from '../components/Shell'
import { Initial, Kbd, Notice, PickedBar } from '../components/ui'
import { useOpenConversation } from '../lib/agent'
import { ApiError } from '../lib/api'
import { pickedRow } from '../lib/look'
import {
  type CaseStatus,
  type Decision,
  type ReportCase,
  type ReportCaseDetail,
  type ReportedListing,
  caseFailure,
  reasonDot,
  reasonLabel,
  reasonsOf,
  useCase,
  useCaseCommands,
  useCases,
} from '../lib/reports'

const DAY = 86_400_000
const HOUR = 3_600_000
const day = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' })
const time = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' })
const money = new Intl.NumberFormat('vi-VN')

const when = (iso: string, now: number) => {
  const d = new Date(iso)
  return new Date(now).toDateString() === d.toDateString() ? time.format(d) : day.format(d)
}
/** How long a case has waited: "2 giờ", "3 ngày". */
const age = (iso: string, now: number) => {
  const ms = Math.max(0, now - new Date(iso).getTime())
  if (ms < HOUR) return `${Math.max(1, Math.round(ms / 60_000))} phút`
  if (ms < DAY) return `${Math.round(ms / HOUR)} giờ`
  return `${Math.round(ms / DAY)} ngày`
}

const listingStatus: Record<string, string> = {
  active: 'Đang bán',
  hidden: 'Đã ẩn',
  reserved: 'Đang giữ',
  sold: 'Đã bán',
  rejected: 'Bị từ chối',
  deleted: 'Đã xoá',
  processing: 'Đang đăng',
}

/** Báo cáo: the case queue, and the case of the account in the URL beside it. */
export function Reports() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<CaseStatus>('open')
  const cases = useCases(status)
  const open = useCases('open')
  const [now] = useState(() => Date.now())
  const rows = useMemo(() => cases.items ?? [], [cases.items])
  const go = useCallback((c: ReportCase) => navigate(`/reports/${c.account.id}`), [navigate])

  // j and k move through the queue, Escape closes the case.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement).closest('input, textarea, select, [contenteditable]')) return
      const at = rows.findIndex((c) => c.account.id === id)
      if (e.key === 'j' || e.key === 'k') {
        const next = rows[Math.min(rows.length - 1, Math.max(0, at + (e.key === 'j' ? 1 : -1)))]
        if (next) go(next)
      } else if (e.key === 'Escape' && id) {
        navigate('/reports')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [rows, id, go, navigate])

  const segment = (s: CaseStatus, label: ReactNode) => (
    <button
      onClick={() => setStatus(s)}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-xs px-2 ${
        s === status ? 'bg-surface-container-lowest text-on-surface shadow-lift' : 'text-on-surface-variant hover:text-on-surface'
      }`}
    >
      {label}
    </button>
  )

  return (
    <Shell flush>
      <section className="flex w-80 shrink-0 flex-col border-r border-hairline">
        <div className="p-3">
          <div role="tablist" className="flex h-8 rounded-sm bg-surface-container p-0.5 text-label-medium">
            {segment(
              'open',
              <>
                Chờ xử lý
                {!!open.total && (
                  <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-error px-1 tabular-nums text-label-small text-on-error">
                    {open.total}
                  </span>
                )}
              </>,
            )}
            {segment('resolved', 'Đã xử lý')}
          </div>
        </div>
        <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
          {rows.map((c) => (
            <QueueRow key={c.account.id + (c.resolution?.at ?? '')} c={c} on={c.account.id === id} now={now} onClick={() => go(c)} />
          ))}
          {cases.data && rows.length === 0 && (
            <p className="px-3 py-6 text-body-medium text-on-surface-variant">{status === 'open' ? 'Không còn vụ nào chờ.' : 'Chưa xử lý vụ nào.'}</p>
          )}
          {cases.hasNextPage && (
            <button
              onClick={() => cases.fetchNextPage()}
              disabled={cases.isFetchingNextPage}
              className="h-9 w-full rounded-sm text-label-large text-primary hover:bg-surface-container-low disabled:opacity-60"
            >
              Xem thêm
            </button>
          )}
        </div>
        <p className="flex items-center gap-1.5 border-t border-hairline px-4 py-2.5 text-body-small text-on-surface-variant">
          <Kbd>j</Kbd>
          <Kbd>k</Kbd>
          Vụ trước, sau
        </p>
      </section>
      {id ? (
        <CasePane
          key={id}
          id={id}
          now={now}
          onMove={(step) => {
            const next = rows[rows.findIndex((c) => c.account.id === id) + step]
            if (next) go(next)
          }}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center text-body-medium text-on-surface-variant">Chọn một vụ</div>
      )}
    </Shell>
  )
}

function CaseInitial({ name, id, reports, size = 36 }: { name: string; id: string; reports: number; size?: number }) {
  return (
    <span className="relative inline-flex h-fit shrink-0">
      <Initial name={name} id={id} size={size} />
      <span
        className={`absolute -bottom-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 tabular-nums text-label-small ring-2 ring-surface-container-lowest ${
          reports > 2 ? 'bg-error text-on-error' : 'bg-surface-container-highest text-on-surface'
        }`}
      >
        {reports}
      </span>
    </span>
  )
}

function ReasonDots({ c, max }: { c: { reasons: ReportCase['reasons'] }; max?: number }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      {reasonsOf(c.reasons)
        .slice(0, max)
        .map(([k, n]) => (
          <span key={k} className="inline-flex items-center gap-1 whitespace-nowrap">
            <span className={`h-1.5 w-1.5 rounded-full ${reasonDot[k]}`} />
            {reasonLabel[k]}
            {n > 1 && ` ${n}`}
          </span>
        ))}
    </span>
  )
}

function QueueRow({ c, on, now, onClick }: { c: ReportCase; on: boolean; now: number; onClick: () => void }) {
  const overdue = !c.resolution && now - new Date(c.last_at).getTime() > DAY
  const r = c.resolution
  return (
    <button onClick={onClick} className={`flex w-full gap-3 rounded-md px-3 py-2.5 text-left ${pickedRow(on)}`}>
      <PickedBar on={on} />
      <CaseInitial name={c.account.display_name} id={c.account.id} reports={c.reports} />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="min-w-0 flex-1 truncate text-label-large">{c.account.display_name}</span>
          <span className={`shrink-0 tabular-nums text-body-small ${overdue ? 'text-error' : 'text-on-surface-variant'}`}>
            {r ? `${r.by.display_name} · ${when(r.at, now)}` : age(c.last_at, now)}
          </span>
        </span>
        <span className="mt-0.5 block truncate text-body-medium text-on-surface-variant">{c.listing?.title ?? 'Tài khoản'}</span>
        <span className="mt-1 flex items-center gap-2 text-body-small text-on-surface-variant">
          <ReasonDots c={c} max={r ? 1 : 2} />
          <span className="min-w-0 flex-1" />
          {r && (
            <span className={`shrink-0 whitespace-nowrap ${r.outcome === 'actioned' ? 'text-error' : ''}`}>
              {r.outcome === 'actioned' ? 'Đã xử lý' : 'Không vi phạm'}
            </span>
          )}
        </span>
      </span>
    </button>
  )
}

function CasePane({ id, now, onMove }: { id: string; now: number; onMove: (step: 1 | -1) => void }) {
  const detail = useCase(id)
  const navigate = useNavigate()
  const openChat = useOpenConversation()

  if (detail.error) {
    const gone = detail.error instanceof ApiError && detail.error.status === 404
    return <div className="flex flex-1 items-center justify-center text-body-medium text-on-surface-variant">{gone ? 'Tài khoản này chưa bị báo cáo.' : 'Chưa tải được vụ này.'}</div>
  }
  if (!detail.data) return <div className="flex-1" />
  const c = detail.data
  const a = c.account

  async function askAgent() {
    const conv = await openChat.mutateAsync({ kind: 'account', id })
    navigate(`/agent/${conv.id}`)
  }

  return (
    <section className="relative flex min-w-0 flex-1 flex-col">
      <header className="flex h-[52px] shrink-0 items-center gap-2 border-b border-hairline px-5 text-body-medium">
        <button onClick={() => navigate('/reports')} className="text-on-surface-variant hover:text-on-surface">
          Báo cáo
        </button>
        <IconChevron width={16} height={16} className="text-outline" />
        <h1 className="truncate text-title-small">{a.display_name}</h1>
        <span className="min-w-0 flex-1 truncate text-body-small text-on-surface-variant">
          · {c.reports.length} báo cáo · từ {when(c.first_at, now)}
        </span>
        <button
          onClick={() => void askAgent()}
          disabled={openChat.isPending}
          className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-hairline px-3 text-label-large hover:bg-surface-container-low disabled:opacity-60"
        >
          <IconSpark width={16} height={16} className="text-primary" />
          Hỏi agent
        </button>
        <button title="Trước (k)" onClick={() => onMove(-1)} className="flex h-7 w-7 items-center justify-center rounded-sm text-on-surface-variant hover:bg-surface-container-low">
          <IconUp width={18} height={18} />
        </button>
        <button title="Sau (j)" onClick={() => onMove(1)} className="flex h-7 w-7 items-center justify-center rounded-sm text-on-surface-variant hover:bg-surface-container-low">
          <IconDown width={18} height={18} />
        </button>
      </header>
      <div className="relative min-h-0 flex-1 overflow-y-auto">
        <Hero c={c} now={now} />
        <div className="space-y-5 px-8 pb-48">
          {c.listings.length > 0 && (
            <section>
              <h3 className="mb-2.5 text-label-medium text-on-surface-variant">Tin bị báo</h3>
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                {c.listings.map((l) => (
                  <ListingCard key={l.id} l={l} reports={c.reports.filter((r) => r.listing_id === l.id).length} />
                ))}
              </div>
            </section>
          )}
          <section>
            <h3 className="mb-2.5 text-label-medium text-on-surface-variant">{c.reports.length} người báo</h3>
            <ul className="divide-y divide-hairline rounded-xl border border-hairline bg-surface-container-lowest px-3.5">
              {c.reports.map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-2.5">
                  <Initial name={r.reporter.display_name} id={r.reporter.id} size={28} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-label-large">{r.reporter.display_name}</span>
                      <span className="inline-flex items-center gap-1 text-body-small text-on-surface-variant">
                        <span className={`h-1.5 w-1.5 rounded-full ${reasonDot[r.reason]}`} />
                        {reasonLabel[r.reason]}
                        {r.listing_id && ` · ${c.listings.find((l) => l.id === r.listing_id)?.title ?? 'tin'}`}
                      </span>
                    </span>
                    {r.note && <span className="mt-0.5 block text-body-small text-on-surface-variant">“{r.note}”</span>}
                  </span>
                  <span className="shrink-0 tabular-nums text-body-small text-on-surface-variant">{when(r.created_at, now)}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
      {c.resolution ? <DoneBar c={c} now={now} /> : <DecisionBar c={c} />}
    </section>
  )
}

function Hero({ c, now }: { c: ReportCaseDetail; now: number }) {
  const navigate = useNavigate()
  const a = c.account
  const locked = a.status === 'suspended'
  const top = c.listings[0]
  return (
    <div className={`relative px-8 pb-5 pt-6 ${locked ? 'band-error' : 'band'}`}>
      <div aria-hidden className="dots pointer-events-none absolute inset-0" />
      <div className="relative flex items-start gap-4">
        <Initial name={a.display_name} id={a.id} size={60} status={a.status} />
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <button onClick={() => navigate(`/accounts/${a.id}`)} className="text-headline-small hover:underline">
              {a.display_name}
            </button>
            {locked ? (
              <span className="inline-flex h-6 items-center gap-1 rounded-full bg-error px-2 text-label-small text-on-error">
                <IconLock width={13} height={13} />
                {a.suspended_until ? `Khoá đến ${day.format(new Date(a.suspended_until))}` : 'Tạm khoá'}
              </span>
            ) : (
              <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-primary/10 px-2 text-label-small text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Hoạt động
              </span>
            )}
          </div>
          <p className="mt-0.5 tabular-nums text-body-small text-on-surface-variant">{a.id.slice(0, 8)}</p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {reasonsOf(c.reasons).map(([k, n]) => (
              <span
                key={k}
                className={`inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-label-medium ${
                  k === 'scam' || k === 'banned' ? 'bg-error-container text-error' : k === 'fake' ? 'bg-tertiary-fixed text-on-tertiary-fixed-variant' : 'bg-surface-container-high text-on-surface-variant'
                }`}
              >
                {reasonLabel[k]}
                <span className="tabular-nums">{n}</span>
              </span>
            ))}
            <span className="inline-flex h-7 items-center gap-1 rounded-full border border-hairline bg-surface-container-lowest/80 px-2.5 text-label-small text-on-surface-variant">
              <IconCalendar width={14} height={14} />
              Tạo {when(a.created_at, now)}
            </span>
          </div>
        </div>
        {top && (
          <div className="hidden w-[300px] shrink-0 xl:block">
            <ListingCard l={top} compact />
          </div>
        )}
      </div>
    </div>
  )
}

function ListingCard({ l, reports, compact = false }: { l: ReportedListing; reports?: number; compact?: boolean }) {
  return (
    <article className="flex items-center gap-3 rounded-xl border border-hairline bg-surface-container-lowest/90 p-2.5 shadow-lift">
      {l.photo_url ? (
        <img src={l.photo_url} alt="" className={`shrink-0 rounded-md object-cover ${compact ? 'h-14 w-14' : 'h-16 w-16'}`} />
      ) : (
        <span className={`flex shrink-0 items-center justify-center rounded-md bg-surface-container text-on-surface-variant ${compact ? 'h-14 w-14' : 'h-16 w-16'}`}>
          <IconPhoto width={22} height={22} />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-label-large">{l.title}</span>
        <span className="mt-0.5 block tabular-nums text-body-medium text-tertiary">{money.format(l.price)} ₫</span>
        <span className="mt-1 flex items-center gap-2 text-body-small text-on-surface-variant">
          <span className={l.status === 'hidden' ? 'text-error' : ''}>{listingStatus[l.status] ?? l.status}</span>
          {reports !== undefined && reports > 0 && <span>· {reports} báo cáo</span>}
        </span>
      </span>
    </article>
  )
}

const terms: [number | null, string][] = [
  [1, '1 ngày'],
  [7, '7 ngày'],
  [30, '30 ngày'],
  [null, 'Không hạn'],
]

function Check({ on }: { on: boolean }) {
  return (
    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] ${on ? 'bg-primary text-on-primary' : 'border border-outline'}`}>
      {on && <IconCheck width={12} height={12} />}
    </span>
  )
}

/** The member's decision on an open case, pinned to the bottom: what to do, the term, the reason the person sees. */
function DecisionBar({ c }: { c: ReportCaseDetail }) {
  const commands = useCaseCommands(c.account.id)
  const hideable = c.listings.filter((l) => l.status === 'active' || l.status === 'reserved')
  const locked = c.account.status === 'suspended'
  const [hide, setHide] = useState<string[]>([])
  const [suspend, setSuspend] = useState(false)
  const [days, setDays] = useState<number | null>(7)
  const [reason, setReason] = useState('')
  const [now] = useState(() => Date.now())
  const first = c.account.display_name.trim().split(/\s+/).pop() ?? c.account.display_name
  const term = days === null ? 'không hạn' : `${days} ngày`
  const failure = commands.decide.error ?? commands.dismiss.error
  const busy = commands.decide.isPending || commands.dismiss.isPending

  const parts = [hide.length > 0 && (hide.length === 1 ? 'Ẩn tin' : `Ẩn ${hide.length} tin`), suspend && `khoá ${term}`].filter(Boolean) as string[]
  const label = parts.length ? parts.join(' và ').replace(/^k/, 'K') : 'Chọn việc cần làm'
  const ready = parts.length > 0 && (!suspend || reason.trim() !== '')

  function apply() {
    const d: Decision = { hide }
    if (suspend) d.suspend = { reason: reason.trim(), until: days === null ? undefined : new Date(now + days * DAY).toISOString() }
    commands.decide.mutate(d)
  }

  const toggle = (id: string) => setHide((h) => (h.includes(id) ? h.filter((x) => x !== id) : [...h, id]))

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-surface-container-lowest from-60% to-transparent px-6 pb-5 pt-10">
      {failure && (
        <div className="pointer-events-auto mb-2">
          <Notice>{caseFailure(failure)}</Notice>
        </div>
      )}
      <section className="pointer-events-auto overflow-hidden rounded-2xl bg-surface-container-lowest shadow-float">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          {hideable.map((l) => (
            <button key={l.id} type="button" onClick={() => toggle(l.id)} className="flex min-w-0 max-w-[260px] items-center gap-2 text-body-medium">
              <Check on={hide.includes(l.id)} />
              <span className="truncate">Ẩn tin {l.title}</span>
            </button>
          ))}
          {!locked && (
            <span className="flex items-center gap-2 whitespace-nowrap text-body-medium">
              <button type="button" onClick={() => setSuspend((s) => !s)} className="flex items-center gap-2">
                <Check on={suspend} />
                Tạm khoá
              </button>
              {suspend && (
                <select
                  value={days ?? ''}
                  onChange={(e) => setDays(e.target.value === '' ? null : Number(e.target.value))}
                  aria-label="Thời hạn"
                  className="h-7 rounded-sm border border-hairline bg-surface-container-lowest px-1.5 text-body-small"
                >
                  {terms.map(([n, t]) => (
                    <option key={t} value={n ?? ''}>
                      {t}
                    </option>
                  ))}
                </select>
              )}
            </span>
          )}
          <span className="flex-1" />
          <button
            onClick={() => commands.dismiss.mutate()}
            disabled={busy}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-sm border border-hairline px-3 text-label-large hover:bg-surface-container-low disabled:opacity-60"
          >
            <IconCheck width={16} height={16} />
            Không vi phạm
          </button>
          <button
            onClick={apply}
            disabled={!ready || busy}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-sm bg-error px-3 text-label-large text-on-error disabled:opacity-50"
          >
            <IconBlock width={16} height={16} />
            {label}
          </button>
        </div>
        {suspend && (
          <label className="flex items-center gap-2 border-t border-hairline bg-surface-container-low px-4 py-2 text-body-small">
            <IconSee width={15} height={15} className="shrink-0 text-on-surface-variant" />
            <span className="shrink-0 text-on-surface-variant">{first} thấy:</span>
            <input
              autoFocus
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              placeholder="Lý do"
              className="min-w-0 flex-1 bg-transparent text-body-medium outline-none placeholder:text-on-surface-variant"
            />
            <span className="tabular-nums text-on-surface-variant">{reason.length}/500</span>
          </label>
        )}
      </section>
    </div>
  )
}

/** A resolved case: what was done, who and when, the log and Hoàn tác. */
function DoneBar({ c, now }: { c: ReportCaseDetail; now: number }) {
  const commands = useCaseCommands(c.account.id)
  const r = c.resolution!
  const hidden = c.listings.filter((l) => l.status === 'hidden').length
  const done =
    r.outcome === 'dismissed'
      ? ['Không vi phạm']
      : [hidden > 0 && (hidden === 1 ? 'Đã ẩn tin' : `Đã ẩn ${hidden} tin`), c.account.status === 'suspended' && 'Đã khoá tài khoản'].filter(Boolean) as string[]
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-surface-container-lowest from-60% to-transparent px-6 pb-5 pt-10">
      {commands.undo.error && (
        <div className="pointer-events-auto mb-2">
          <Notice>{caseFailure(commands.undo.error)}</Notice>
        </div>
      )}
      <section className="pointer-events-auto flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-hairline bg-surface-container-low px-4 py-3">
        {(done.length ? done : ['Đã xử lý']).map((t) => (
          <span key={t} className="inline-flex items-center gap-1.5 whitespace-nowrap text-body-medium">
            <IconCheckCircle width={16} height={16} className="text-primary" />
            {t}
          </span>
        ))}
        <span className="flex-1" />
        <span className="flex items-center gap-1.5 whitespace-nowrap text-body-small text-on-surface-variant">
          <Initial name={r.by.display_name} id={r.by.member_id} size={20} member />
          {r.by.display_name} · {when(r.at, now)}
        </span>
        <button
          onClick={() => commands.undo.mutate(c)}
          disabled={commands.undo.isPending}
          className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-sm border border-hairline bg-surface-container-lowest px-3 text-label-large hover:bg-surface-container disabled:opacity-60"
        >
          <IconUndo width={16} height={16} />
          Hoàn tác
        </button>
      </section>
    </div>
  )
}
