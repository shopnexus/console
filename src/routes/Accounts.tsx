import { type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import IconSpark from '~icons/material-symbols/auto-awesome-outline-rounded'
import IconBlock from '~icons/material-symbols-light/block'
import IconCalendar from '~icons/material-symbols-light/calendar-today-outline-rounded'
import IconCall from '~icons/material-symbols-light/call-outline-rounded'
import IconCheck from '~icons/material-symbols-light/check-rounded'
import IconChevron from '~icons/material-symbols-light/chevron-right-rounded'
import IconCopy from '~icons/material-symbols-light/content-copy-outline-rounded'
import IconDown from '~icons/material-symbols-light/keyboard-arrow-down-rounded'
import IconUp from '~icons/material-symbols-light/keyboard-arrow-up-rounded'
import IconHistory from '~icons/material-symbols-light/history-rounded'
import IconLock from '~icons/material-symbols-light/lock-outline'
import IconLockClock from '~icons/material-symbols-light/lock-clock-outline-rounded'
import IconUnlock from '~icons/material-symbols-light/lock-open-outline-rounded'
import IconMail from '~icons/material-symbols-light/mail-outline-rounded'
import IconCreated from '~icons/material-symbols-light/person-add-outline-rounded'
import IconSearch from '~icons/material-symbols-light/search-rounded'
import IconVerified from '~icons/material-symbols-light/verified-rounded'
import IconSee from '~icons/material-symbols-light/visibility-outline'
import { Shell } from '../components/Shell'
import { Initial, Kbd, Notice, PickedBar } from '../components/ui'
import {
  type AccountDetail,
  type AccountTab,
  accountFailure,
  rememberAccount,
  useAccountCommands,
  useAccountDetail,
  useAccountList,
  useAccountSearch,
} from '../lib/accounts'
import { useOpenConversation } from '../lib/agent'
import { type Account, type Action, ApiError } from '../lib/api'
import { useDismiss } from '../lib/dom'
import { pickedRow, segment as segmentLook } from '../lib/look'

const DAY = 86_400_000
const day = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' })
const date = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
const time = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' })

const thisYear = (d: Date) => d.getFullYear() === new Date().getFullYear()
const short = (iso: string) => {
  const d = new Date(iso)
  return thisYear(d) ? day.format(d) : date.format(d)
}
const stamp = (iso: string) => `${short(iso)} ${time.format(new Date(iso))}`
const daysLeft = (until: string, now: number) => Math.max(1, Math.ceil((new Date(until).getTime() - now) / DAY))

/** The line under an account's name in the list. */
function listLine(a: Account): string {
  if (a.status !== 'suspended') return `Từ ${short(a.created_at)}`
  const end = a.suspended_until ? `Đến ${short(a.suspended_until)}` : 'Không thời hạn'
  return [end, a.suspend_reason].filter(Boolean).join(' · ')
}

/** "7 ngày" for a suspension's term, from its action. */
function term(a: Action): string {
  const until = typeof a.details?.until === 'string' ? a.details.until : undefined
  if (!until) return 'không thời hạn'
  return `${Math.max(1, Math.round((new Date(until).getTime() - new Date(a.at).getTime()) / DAY))} ngày`
}

const reasonOf = (a: Action) => (typeof a.details?.reason === 'string' ? a.details.reason : '')

/** Tài khoản: the list, and the account in the URL beside it. */
export function Accounts() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState<AccountTab>('all')
  const [q, setQ] = useState('')
  const [asked, setAsked] = useState('')
  const list = useAccountList(tab)
  const suspended = useAccountList('suspended')
  const found = useAccountSearch(asked)
  const [now] = useState(() => Date.now())
  const rows = useMemo(
    () => (asked ? (found.data?.items ?? []).filter((a) => tab === 'all' || a.status === 'suspended') : (list.items ?? [])),
    [asked, found.data, tab, list.items],
  )
  const open = useCallback(
    (a: Account) => {
      rememberAccount(a)
      navigate(`/accounts/${a.id}`)
    },
    [navigate],
  )

  // j and k move through the list, Escape closes the account.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement).closest('input, textarea, [contenteditable]')) return
      const at = rows.findIndex((a) => a.id === id)
      if (e.key === 'j' || e.key === 'k') {
        const next = rows[Math.min(rows.length - 1, Math.max(0, at + (e.key === 'j' ? 1 : -1)))]
        if (next) open(next)
      } else if (e.key === 'Escape' && id) {
        navigate('/accounts')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [rows, id, open, navigate])

  const segment = (t: AccountTab, label: ReactNode) => (
    <button
      onClick={() => setTab(t)}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-xs px-2 ${segmentLook(t === tab)}`}
    >
      {label}
    </button>
  )
  const count = suspended.data?.pages[0]?.total

  return (
    <Shell flush>
      <section className="flex w-[340px] shrink-0 flex-col border-r border-hairline">
        <div className="space-y-2.5 p-3">
          <div role="tablist" className="flex h-8 rounded-sm bg-surface-container p-0.5 text-label-medium">
            {segment('all', 'Tất cả')}
            {segment(
              'suspended',
              <>
                Đang khoá
                {count !== undefined && count > 0 && (
                  <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-error px-1 tabular-nums text-label-small text-on-error">
                    {count}
                  </span>
                )}
              </>,
            )}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              setAsked(q.trim())
            }}
            className="flex h-9 items-center gap-2 rounded-sm border border-hairline bg-surface-container-lowest px-2.5 text-on-surface-variant focus-within:border-outline"
          >
            <IconSearch width={17} height={17} />
            <input
              id="account-find"
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                if (e.target.value === '') setAsked('')
              }}
              placeholder="Id hoặc số điện thoại"
              aria-label="Tìm tài khoản"
              className="h-full min-w-0 flex-1 bg-transparent text-body-medium text-on-surface outline-none placeholder:text-on-surface-variant"
            />
            <Kbd>/</Kbd>
          </form>
        </div>
        <div key={asked ? 'found' : tab} className="rise-list min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
          {rows.map((a) => (
            <ListRow key={a.id} a={a} on={a.id === id} now={now} onClick={() => open(a)} />
          ))}
          {(asked ? found.data : list.data) && rows.length === 0 && (
            <p className="px-3 py-6 text-body-medium text-on-surface-variant">
              {asked ? 'Không có tài khoản nào khớp.' : tab === 'suspended' ? 'Không ai đang bị khoá.' : 'Chưa có tài khoản nào.'}
            </p>
          )}
          {!asked && list.hasNextPage && (
            <button
              onClick={() => list.fetchNextPage()}
              disabled={list.isFetchingNextPage}
              className="h-9 w-full rounded-sm text-label-large text-primary hover:bg-surface-container-low disabled:opacity-60"
            >
              Xem thêm
            </button>
          )}
        </div>
        <p className="flex items-center gap-1.5 border-t border-hairline px-4 py-2.5 text-body-small text-on-surface-variant">
          <Kbd>j</Kbd>
          <Kbd>k</Kbd>
          Tài khoản trước, sau
        </p>
      </section>
      {id ? (
        <AccountPane key={id} id={id} onMove={(step) => {
          const at = rows.findIndex((a) => a.id === id)
          const next = rows[at + step]
          if (next) open(next)
        }} />
      ) : (
        <div className="flex flex-1 items-center justify-center text-body-medium text-on-surface-variant">Chọn một tài khoản</div>
      )}
    </Shell>
  )
}

function ListRow({ a, on, now, onClick }: { a: Account; on: boolean; now: number; onClick: () => void }) {
  const locked = a.status === 'suspended'
  return (
    <button onClick={onClick} className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left ${pickedRow(on)}`}>
      <PickedBar on={on} />
      <Initial name={a.display_name} id={a.id} size={36} status={a.status} />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="min-w-0 flex-1 truncate text-label-large">{a.display_name}</span>
          <span className="shrink-0 tabular-nums text-body-small text-on-surface-variant">
            {locked && a.suspended_until ? `còn ${daysLeft(a.suspended_until, now)} ngày` : short(a.created_at)}
          </span>
        </span>
        <span className={`mt-0.5 flex items-center gap-1 text-body-small ${locked ? 'text-error' : 'text-on-surface-variant'}`}>
          {locked && <IconLock width={13} height={13} className="shrink-0" />}
          <span className="truncate">{listLine(a)}</span>
        </span>
      </span>
    </button>
  )
}

function AccountPane({ id, onMove }: { id: string; onMove: (step: 1 | -1) => void }) {
  const detail = useAccountDetail(id)
  const navigate = useNavigate()
  const openChat = useOpenConversation()
  const commands = useAccountCommands(id)
  const [suspending, setSuspending] = useState(false)
  const closeSuspend = useCallback(() => setSuspending(false), [])
  // The button and its popover share one box, so a press on the button toggles.
  const suspendBox = useDismiss<HTMLDivElement>(suspending, closeSuspend)
  const [now] = useState(() => Date.now())

  if (detail.error) {
    const gone = detail.error instanceof ApiError && detail.error.status === 404
    return <div className="flex flex-1 items-center justify-center text-body-medium text-on-surface-variant">{gone ? 'Không có tài khoản này.' : 'Chưa tải được tài khoản.'}</div>
  }
  if (!detail.data) return <div className="flex-1" />
  const { account: a, identities, actions } = detail.data
  const locked = a.status === 'suspended'
  const suspensions = actions.filter((x) => x.action === 'account.suspend')
  const failure = commands.suspend.error ?? commands.unsuspend.error

  async function askAgent() {
    const c = await openChat.mutateAsync({ kind: 'account', id })
    navigate(`/agent/${c.id}`)
  }

  return (
    <section className="relative flex min-w-0 flex-1 animate-pane flex-col">
      <header className="flex h-[52px] shrink-0 items-center gap-2 border-b border-hairline px-5 text-body-medium">
        <button onClick={() => navigate('/accounts')} className="text-on-surface-variant hover:text-on-surface">
          Tài khoản
        </button>
        <IconChevron width={16} height={16} className="text-outline" />
        <h1 className="min-w-0 flex-1 truncate text-title-small">{a.display_name}</h1>
        <button title="Trước (k)" onClick={() => onMove(-1)} className="flex h-7 w-7 items-center justify-center rounded-sm text-on-surface-variant hover:bg-surface-container-low">
          <IconUp width={18} height={18} />
        </button>
        <button title="Sau (j)" onClick={() => onMove(1)} className="flex h-7 w-7 items-center justify-center rounded-sm text-on-surface-variant hover:bg-surface-container-low">
          <IconDown width={18} height={18} />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className={`relative px-8 pb-6 pt-7 ${locked ? 'band-error' : 'band'}`}>
          <div aria-hidden className="dots pointer-events-none absolute inset-0" />
          <div className="relative flex items-start gap-5">
            <Initial name={a.display_name} id={a.id} size={72} status={a.status} />
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-headline-small">{a.display_name}</h2>
                <StatusPill locked={locked} />
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-body-small text-on-surface-variant">
                <span className="tabular-nums">{a.id.slice(0, 8)}</span>
                <button
                  title="Chép id"
                  onClick={() => void navigator.clipboard?.writeText(a.id)}
                  className="flex h-5 w-5 items-center justify-center rounded-xs hover:bg-surface-container-low"
                >
                  <IconCopy width={13} height={13} />
                </button>
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {identities.some((i) => i.kind === 'phone') && (
                  <Chip icon={<IconVerified width={14} height={14} />} tone="text-primary">
                    SĐT đã xác minh
                  </Chip>
                )}
                {suspensions.length > (locked ? 1 : 0) && (
                  <Chip icon={<IconHistory width={14} height={14} />} tone={locked ? 'text-error' : undefined}>
                    {locked ? `Bị khoá ${suspensions.length} lần` : `Từng bị khoá ${suspensions.length} lần`}
                  </Chip>
                )}
              </div>
            </div>
            <div className="relative flex items-center gap-2 pt-1">
              <button
                onClick={() => void askAgent()}
                disabled={openChat.isPending}
                className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-hairline bg-surface-container-lowest px-3 text-label-large hover:bg-surface-container-low disabled:opacity-60"
              >
                <IconSpark width={16} height={16} className="text-primary" />
                Hỏi agent
              </button>
              {locked ? (
                <button
                  onClick={() => commands.unsuspend.mutate()}
                  disabled={commands.unsuspend.isPending}
                  className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-primary px-3 text-label-large text-on-primary disabled:opacity-60"
                >
                  <IconUnlock width={16} height={16} />
                  Mở khoá
                </button>
              ) : (
                <div ref={suspendBox} className="relative">
                  <button
                    onClick={() => setSuspending((s) => !s)}
                    aria-expanded={suspending}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-sm border px-3 text-label-large text-error ${
                      suspending ? 'border-error bg-error-container' : 'border-error/40 bg-surface-container-lowest hover:bg-surface-container-low'
                    }`}
                  >
                    <IconBlock width={16} height={16} />
                    Tạm khoá
                  </button>
                  {suspending && <SuspendPopover a={a} onClose={closeSuspend} suspend={commands.suspend} />}
                </div>
              )}
            </div>
          </div>
          {locked && <TermCard a={a} last={suspensions[0]} now={now} />}
          {failure && (
            <div className="relative mt-4">
              <Notice>{accountFailure(failure)}</Notice>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 px-8 pb-8 lg:grid-cols-[1fr_272px]">
          <Card title="Lịch sử" aside={actions.length > 0 && <span className="tabular-nums text-body-small text-on-surface-variant">{actions.length} thao tác</span>}>
            <History d={detail.data} />
          </Card>
          <div className="space-y-4">
            <Card title="Thông tin">
              <Fact icon={<IconCalendar width={16} height={16} />} label="Tham gia">
                {date.format(new Date(a.created_at))}
              </Fact>
            </Card>
            <Card title="Định danh">
              {identities.map((i) => (
                <Fact
                  key={i.kind + i.value}
                  icon={i.kind === 'phone' ? <IconCall width={16} height={16} /> : <IconMail width={16} height={16} />}
                  label={i.kind === 'phone' ? 'Số điện thoại' : 'Email'}
                >
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    {i.value}
                    <IconVerified width={14} height={14} className="text-primary" />
                  </span>
                </Fact>
              ))}
              {identities.length === 0 && <p className="py-1.5 text-body-medium text-on-surface-variant">Không còn định danh.</p>}
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
}

function StatusPill({ locked }: { locked: boolean }) {
  return locked ? (
    <span className="inline-flex h-6 items-center gap-1 rounded-full bg-error px-2 text-label-small text-on-error">
      <IconLock width={13} height={13} />
      Tạm khoá
    </span>
  ) : (
    <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-primary/10 px-2 text-label-small text-primary">
      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
      Hoạt động
    </span>
  )
}

function Chip({ icon, tone = 'text-on-surface-variant', children }: { icon: ReactNode; tone?: string; children: ReactNode }) {
  return (
    <span className={`inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full border border-hairline bg-surface-container-lowest/80 px-2 text-label-small ${tone}`}>
      {icon}
      {children}
    </span>
  )
}

function Card({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-hairline bg-surface-container-lowest">
      <div className="flex items-center gap-2 border-b border-hairline px-4 py-2.5">
        <h3 className="flex-1 text-title-small">{title}</h3>
        {aside}
      </div>
      <div className="px-4 py-3">{children}</div>
    </section>
  )
}

function Fact({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <span className="text-on-surface-variant">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-body-small text-on-surface-variant">{label}</p>
        <div className="mt-0.5 truncate text-body-medium">{children}</div>
      </div>
    </div>
  )
}

/** A suspended account's term: the end, the days left, the time served, who suspended it. */
function TermCard({ a, last, now }: { a: Account; last?: Action; now: number }) {
  const until = a.suspended_until
  const start = last ? new Date(last.at).getTime() : undefined
  const served = until && start ? Math.min(100, Math.max(2, ((now - start) / (new Date(until).getTime() - start)) * 100)) : undefined
  return (
    <div className="relative mt-5 flex items-center gap-4 rounded-xl border border-error/20 bg-surface-container-lowest/90 px-4 py-3.5 shadow-lift">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-error-container text-error">
        <IconLockClock width={20} height={20} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className="flex-1 text-title-small">{until ? `Đến ${stamp(until)}` : 'Không thời hạn'}</p>
          {until && <p className="tabular-nums text-label-large text-error">còn {daysLeft(until, now)} ngày</p>}
        </div>
        {a.suspend_reason && <p className="mt-1 text-body-medium">{a.suspend_reason}</p>}
        {served !== undefined && (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-error-container">
            <span className="block h-full origin-left animate-grow rounded-full bg-error" style={{ width: `${served}%` }} />
          </div>
        )}
        {last && (
          <div className="mt-2 flex items-center gap-2 text-body-small text-on-surface-variant">
            <span className="tabular-nums">{short(last.at)}</span>
            <span className="flex-1" />
            <Initial name={last.actor.display_name ?? 'CLI'} id={last.actor.member_id ?? 'cli'} size={20} member />
            <span>
              {last.actor.display_name ?? 'CLI'} · {term(last)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

/** The console's actions on the account, newest first, ending on its creation. */
function History({ d }: { d: AccountDetail }) {
  const rows = d.actions.filter((x) => x.action === 'account.suspend' || x.action === 'account.unsuspend')
  return (
    <ul className="rise-list relative before:absolute before:bottom-4 before:left-[13px] before:top-4 before:w-px before:bg-outline-variant">
      {rows.map((x) => {
        const suspend = x.action === 'account.suspend'
        const who = x.actor.display_name ?? 'CLI'
        const reason = reasonOf(x)
        return (
          <li key={x.id} className="relative flex gap-3 pb-5 last:pb-0">
            <span
              className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-4 ring-surface-container-lowest ${
                suspend ? 'bg-error-container text-error' : 'bg-primary/10 text-primary'
              }`}
            >
              {suspend ? <IconLock width={15} height={15} /> : <IconUnlock width={15} height={15} />}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-center gap-2">
                <Initial name={who} id={x.actor.member_id ?? 'cli'} size={20} member />
                <p className="flex-1 text-label-large">{suspend ? `${who} tạm khoá · ${term(x)}` : `${who} mở khoá`}</p>
                <p className="tabular-nums text-body-small text-on-surface-variant">{stamp(x.at)}</p>
              </div>
              {reason && (
                <p className={`mt-2 rounded-md border-l-2 bg-surface-container-low px-3 py-2 text-body-small ${suspend ? 'border-error/50' : 'border-primary/50'}`}>
                  {reason}
                </p>
              )}
            </div>
          </li>
        )
      })}
      <li className="relative flex items-center gap-3">
        <span className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-container text-on-surface-variant ring-4 ring-surface-container-lowest">
          <IconCreated width={15} height={15} />
        </span>
        <p className="flex-1 text-body-medium text-on-surface-variant">Tạo tài khoản</p>
        <p className="tabular-nums text-body-small text-on-surface-variant">{date.format(new Date(d.account.created_at))}</p>
      </li>
    </ul>
  )
}

const terms: [number | null, string][] = [
  [1, '1 ngày'],
  [7, '7 ngày'],
  [30, '30 ngày'],
  [null, 'Không hạn'],
]

/** Tạm khoá: the term with its end date, and the reason the person sees. */
function SuspendPopover({
  a,
  onClose,
  suspend,
}: {
  a: Account
  onClose: () => void
  suspend: ReturnType<typeof useAccountCommands>['suspend']
}) {
  const [days, setDays] = useState<number | null>(7)
  const [reason, setReason] = useState('')
  const [now] = useState(() => Date.now())
  const first = a.display_name.trim().split(/\s+/).pop() ?? a.display_name
  const label = days === null ? 'không hạn' : `${days} ngày`

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!reason.trim()) return
    const until = days === null ? undefined : new Date(now + days * DAY).toISOString()
    suspend.mutate({ reason: reason.trim(), until }, { onSuccess: onClose })
  }

  return (
    <form
      onSubmit={submit}
      className="absolute right-0 top-full z-30 mt-2 w-[400px] origin-top-right animate-pop overflow-hidden rounded-2xl bg-surface-container-lowest shadow-float"
    >
      <div className="flex items-center gap-3 px-4 pt-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-error-container text-error">
          <IconBlock width={18} height={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-title-small">Tạm khoá {a.display_name}</p>
          <p className="tabular-nums text-body-small text-on-surface-variant">{a.id.slice(0, 8)}</p>
        </div>
      </div>
      <div role="radiogroup" aria-label="Thời hạn" className="flex gap-2 px-4 pt-4">
        {terms.map(([n, text]) => (
          <button
            key={text}
            type="button"
            role="radio"
            aria-checked={days === n}
            onClick={() => setDays(n)}
            className={`flex flex-1 flex-col items-center rounded-md border py-2 ${
              days === n ? 'border-error bg-error-container/50 text-error ring-[3px] ring-error/10' : 'border-hairline hover:bg-surface-container-low'
            }`}
          >
            <span className="text-label-large">{text}</span>
            <span className={`tabular-nums text-body-small ${days === n ? '' : 'text-on-surface-variant'}`}>
              {n === null ? '—' : day.format(new Date(now + n * DAY))}
            </span>
          </button>
        ))}
      </div>
      <div className="px-4 pt-3">
        <textarea
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="Lý do"
          aria-label="Lý do"
          className="w-full resize-none rounded-md border border-hairline bg-transparent px-3 py-2.5 text-body-medium outline-none placeholder:text-on-surface-variant focus:border-outline focus:ring-[3px] focus:ring-primary/10"
        />
        <div className="mt-1 flex items-center gap-1 text-body-small text-on-surface-variant">
          <IconSee width={14} height={14} />
          <span className="flex-1">{first} thấy lý do này</span>
          <span className="tabular-nums">{reason.length}/500</span>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-end gap-2 border-t border-hairline bg-surface-container-low px-4 py-2.5">
        <button type="button" onClick={onClose} className="inline-flex h-8 items-center rounded-sm px-3 text-label-large text-on-surface-variant hover:bg-surface-container">
          Huỷ
        </button>
        <button
          type="submit"
          disabled={!reason.trim() || suspend.isPending}
          className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-error px-3 text-label-large text-on-error disabled:opacity-60"
        >
          {suspend.isPending ? <IconCheck width={16} height={16} /> : <IconBlock width={16} height={16} />}
          Tạm khoá {label}
        </button>
      </div>
    </form>
  )
}
