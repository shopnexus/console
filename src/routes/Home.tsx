import { useQuery } from '@tanstack/react-query'
import { type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react'
import IconBlock from '~icons/material-symbols/block'
import IconChevron from '~icons/material-symbols/chevron-right-rounded'
import IconKey from '~icons/material-symbols/key-outline-rounded'
import IconPerson from '~icons/material-symbols/person-add-outline-rounded'
import IconPersonOff from '~icons/material-symbols/person-off-outline-rounded'
import IconPhoneLock from '~icons/material-symbols/phonelink-lock-outline-rounded'
import IconSearch from '~icons/material-symbols/search-rounded'
import IconUnlock from '~icons/material-symbols/lock-open-right-outline-rounded'
import { Shell } from '../components/Shell'
import { useMembersToSee } from '../lib/members'
import { Kbd, Shape } from '../components/ui'
import { type Account, type Action, type ActionKind, api, type Page } from '../lib/api'
import { useMe } from '../lib/session'

const kinds: Record<ActionKind, [string, ReactNode, 'error' | 'primary' | 'neutral']> = {
  'account.suspend': ['Tạm khoá', <IconBlock key="a" width={16} height={16} />, 'error'],
  'account.unsuspend': ['Mở khoá', <IconUnlock key="b" width={16} height={16} />, 'primary'],
  'staff.create': ['Tạo nhân viên', <IconPerson key="c" width={16} height={16} />, 'neutral'],
  'staff.disable': ['Vô hiệu hoá', <IconPersonOff key="d" width={16} height={16} />, 'error'],
  'staff.enable': ['Bật lại', <IconPerson key="e" width={16} height={16} />, 'neutral'],
  'staff.reset_password': ['Đặt lại mật khẩu', <IconKey key="f" width={16} height={16} />, 'neutral'],
  'staff.reset_totp': ['Đặt lại 2 bước', <IconPhoneLock key="g" width={16} height={16} />, 'neutral'],
  'staff.unlock': ['Mở đăng nhập', <IconKey key="h" width={16} height={16} />, 'neutral'],
}

const tone = {
  error: 'bg-error-container text-error',
  primary: 'bg-secondary-container text-on-secondary-container',
  neutral: 'bg-surface-container-high text-on-surface-variant',
}

const time = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' })
const day = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' })

function when(iso: string): string {
  const d = new Date(iso)
  return d.toDateString() === new Date().toDateString() ? time.format(d) : day.format(d)
}

const shortId = (id: string) => id.slice(0, 8)

// The accounts a member looked up last, kept in this browser.
const recentKey = 'console-recent-accounts'
type Recent = Account & { opened: string }

function readRecent(): Recent[] {
  try {
    return JSON.parse(localStorage.getItem(recentKey) ?? '[]') as Recent[]
  } catch {
    return []
  }
}

function remember(a: Account): Recent[] {
  const list = [{ ...a, opened: new Date().toISOString() }, ...readRecent().filter((r) => r.id !== a.id)].slice(0, 8)
  try {
    localStorage.setItem(recentKey, JSON.stringify(list))
  } catch {
    // Without storage the list lasts the page.
  }
  return list
}

export function Home() {
  const me = useMe()
  const admin = me.role === 'admin'
  const [recent, setRecent] = useState<Recent[]>(readRecent)
  return (
    <Shell title="Trang chủ">
      <div className="space-y-6">
        <Search onOpen={(a) => setRecent(remember(a))} />
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[1fr_288px]">
          {admin ? <ActionsCard /> : <RecentCard recent={recent} />}
          {admin ? <MembersCard /> : <ShortcutsCard />}
        </div>
      </div>
    </Shell>
  )
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl bg-surface-container-lowest p-6">
      <h2 className="mb-3 text-title-medium">{title}</h2>
      {children}
    </section>
  )
}

function StatusChip({ a }: { a: Account }) {
  return a.status === 'suspended' ? (
    <span className="rounded-sm bg-error-container px-2 py-0.5 text-label-medium text-error">Tạm khoá</span>
  ) : (
    <span className="rounded-sm bg-secondary-container px-2 py-0.5 text-label-medium text-on-secondary-container">Hoạt động</span>
  )
}

function accountLine(a: Account): string {
  if (a.status !== 'suspended') return `Từ ${day.format(new Date(a.created_at))}`
  const until = a.suspended_until ? `đến ${day.format(new Date(a.suspended_until))}` : 'không thời hạn'
  return [`Tạm khoá ${until}`, a.suspend_reason].filter(Boolean).join(' · ')
}

function AccountRow({ a, right, onClick }: { a: Account; right?: ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="state-layer flex min-h-16 w-full items-center gap-4 border-t border-outline-variant px-3 py-2 text-left">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-title-small uppercase text-on-surface-variant">
        {a.display_name.trim()[0]}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-title-small">{a.display_name}</span>
          <span className="font-mono text-body-small text-on-surface-variant">{shortId(a.id)}</span>
          <StatusChip a={a} />
        </span>
        <span className="block truncate text-body-small text-on-surface-variant">{accountLine(a)}</span>
      </span>
      {right}
    </button>
  )
}

/** The search band: an id, an email or a phone number, exactly; "/" focuses it. */
function Search({ onOpen }: { onOpen: (a: Account) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [q, setQ] = useState('')
  const [asked, setAsked] = useState('')
  const result = useQuery({
    queryKey: ['staff', 'accounts', asked],
    queryFn: () => api<Page<Account>>(`/staff/accounts?q=${encodeURIComponent(asked)}&limit=5`),
    enabled: asked !== '',
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault()
        input.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  const submit = (e: FormEvent) => {
    e.preventDefault()
    setAsked(q.trim())
  }
  return (
    <section className="relative overflow-hidden rounded-xl-plus bg-primary-container px-10 py-8">
      <Shape name="Cookie9Sided" size={360} className="absolute -right-20 -top-28 text-inverse-primary opacity-[.18]" />
      <Shape name="Clover4Leaf" size={96} className="absolute bottom-2 right-56 text-on-primary-container opacity-25" />
      <form onSubmit={submit} className="relative flex h-14 max-w-[680px] items-center gap-3 rounded-full bg-surface-container-lowest px-5 text-on-surface-variant">
        <IconSearch width={24} height={24} />
        <input
          ref={input}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Id, email hoặc số điện thoại"
          aria-label="Tìm tài khoản"
          className="h-full min-w-0 flex-1 bg-transparent text-body-large text-on-surface outline-none placeholder:text-on-surface-variant"
        />
        <Kbd>/</Kbd>
      </form>
      {asked !== '' && !result.isPending && (
        <div className="relative mt-4 max-w-[680px] overflow-hidden rounded-xl bg-surface-container-lowest text-on-surface">
          {result.data?.items.length ? (
            result.data.items.map((a) => <AccountRow key={a.id} a={a} onClick={() => onOpen(a)} />)
          ) : (
            <p className="px-5 py-4 text-body-medium text-on-surface-variant">Không có tài khoản nào khớp.</p>
          )}
        </div>
      )}
    </section>
  )
}

function ActionsCard() {
  const actions = useQuery({ queryKey: ['staff', 'actions', 'latest'], queryFn: () => api<Page<Action>>('/staff/actions?limit=8') })
  const cols = 'grid grid-cols-[64px_128px_136px_1fr] items-center gap-4'
  return (
    <Card title="Nhật ký thao tác">
      <div className={`${cols} px-3 pb-2 text-label-large text-on-surface-variant`}>
        <span>Lúc</span>
        <span>Người làm</span>
        <span>Thao tác</span>
        <span>Đối tượng và lý do</span>
      </div>
      {actions.data?.items.map((a) => {
        const [label, icon, t] = kinds[a.action]
        const reason = typeof a.details?.reason === 'string' ? a.details.reason : ''
        return (
          <div key={a.id} className={`${cols} min-h-[52px] border-t border-outline-variant px-3 py-2.5 text-body-medium`}>
            <span className="text-on-surface-variant">{when(a.at)}</span>
            <span className="truncate">{a.actor.display_name ?? 'CLI'}</span>
            <span className={`inline-flex w-fit items-center gap-1.5 rounded-sm px-2 py-1 text-label-medium ${tone[t]}`}>
              {icon}
              {label}
            </span>
            <span className="min-w-0">
              <span className="block">
                {a.target.kind === 'account' ? 'Tài khoản' : 'Nhân viên'}{' '}
                <span className="font-mono text-body-small text-on-surface-variant">{shortId(a.target.id)}</span>
              </span>
              {reason && <span className="block text-body-small text-on-surface-variant">{reason}</span>}
            </span>
          </div>
        )
      })}
      {actions.data?.items.length === 0 && <p className="border-t border-outline-variant px-3 py-4 text-body-medium text-on-surface-variant">Chưa có thao tác nào.</p>}
    </Card>
  )
}

function MembersCard() {
  const toSee = useMembersToSee(true)
  const [now] = useState(() => Date.now())
  return (
    <Card title="Nhân viên">
      {toSee.data?.map((m) => {
        const locked = m.locked_until !== undefined && new Date(m.locked_until).getTime() > now
        return (
          <div key={m.id} className="flex items-center gap-3 rounded-lg px-2 py-2.5">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                locked ? 'bg-error-container text-error' : 'bg-tertiary-fixed text-on-tertiary-fixed-variant'
              }`}
            >
              {locked ? <IconKey width={20} height={20} /> : <IconPhoneLock width={20} height={20} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-title-small">{m.display_name}</span>
              <span className="block text-body-small text-on-surface-variant">
                {locked ? `Khoá đăng nhập đến ${time.format(new Date(m.locked_until!))}` : 'Chưa bật 2 bước'}
              </span>
            </span>
            <IconChevron width={20} height={20} className="text-outline" />
          </div>
        )
      })}
      {toSee.data?.length === 0 && <p className="px-2 py-2 text-body-medium text-on-surface-variant">Không ai cần xử lý.</p>}
    </Card>
  )
}

function RecentCard({ recent }: { recent: Recent[] }) {
  return (
    <Card title="Vừa mở">
      {recent.map((a) => (
        <AccountRow key={a.id} a={a} right={<span className="text-body-small text-on-surface-variant">{when(a.opened)}</span>} />
      ))}
      {recent.length === 0 && <p className="border-t border-outline-variant px-3 py-4 text-body-medium text-on-surface-variant">Chưa mở tài khoản nào.</p>}
    </Card>
  )
}

const shortcuts: [string[], string][] = [
  [['/'], 'Tìm tài khoản'],
  [['j', 'k'], 'Lên, xuống trong danh sách'],
  [['Enter'], 'Mở bản ghi'],
  [['Esc'], 'Đóng panel bên cạnh'],
]

function ShortcutsCard() {
  return (
    <Card title="Phím tắt">
      {shortcuts.map(([keys, text]) => (
        <div key={text} className="flex items-center justify-between py-2 text-body-medium">
          <span className="text-on-surface-variant">{text}</span>
          <span className="flex gap-1">
            {keys.map((k) => (
              <Kbd key={k}>{k}</Kbd>
            ))}
          </span>
        </div>
      ))}
    </Card>
  )
}
