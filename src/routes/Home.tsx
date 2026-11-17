import { useQuery } from '@tanstack/react-query'
import { type ReactNode, useState } from 'react'
import { useNavigate } from 'react-router'
import IconBlock from '~icons/material-symbols/block'
import IconChevron from '~icons/material-symbols/chevron-right-rounded'
import IconKey from '~icons/material-symbols/key-outline-rounded'
import IconPerson from '~icons/material-symbols/person-add-outline-rounded'
import IconPersonOff from '~icons/material-symbols/person-off-outline-rounded'
import IconPhoneLock from '~icons/material-symbols/phonelink-lock-outline-rounded'
import IconUnlock from '~icons/material-symbols/lock-open-right-outline-rounded'
import IconCheck from '~icons/material-symbols/check-rounded'
import IconFlag from '~icons/material-symbols/flag-outline-rounded'
import IconHide from '~icons/material-symbols/visibility-off-outline-rounded'
import IconShow from '~icons/material-symbols/visibility-outline-rounded'
import { Shell } from '../components/Shell'
import { useMembersToSee } from '../lib/members'
import { AccountRow } from '../components/AccountSearch'
import { Initial, Kbd } from '../components/ui'
import { type Action, type ActionKind, api, type Page, shortId } from '../lib/api'
import { useRecentAccounts } from '../lib/accounts'
import { useMe } from '../lib/session'

const kinds: Record<ActionKind, [string, ReactNode, 'error' | 'primary' | 'neutral']> = {
  'account.suspend': ['Tạm khoá', <IconBlock key="a" width={16} height={16} />, 'error'],
  'account.unsuspend': ['Mở khoá', <IconUnlock key="b" width={16} height={16} />, 'primary'],
  'member.create': ['Tạo nhân viên', <IconPerson key="c" width={16} height={16} />, 'neutral'],
  'member.disable': ['Vô hiệu hoá', <IconPersonOff key="d" width={16} height={16} />, 'error'],
  'member.enable': ['Bật lại', <IconPerson key="e" width={16} height={16} />, 'neutral'],
  'member.reset_password': ['Đặt lại mật khẩu', <IconKey key="f" width={16} height={16} />, 'neutral'],
  'member.reset_totp': ['Đặt lại 2 bước', <IconPhoneLock key="g" width={16} height={16} />, 'neutral'],
  'member.unlock': ['Mở đăng nhập', <IconKey key="h" width={16} height={16} />, 'neutral'],
  'report.dismiss': ['Không vi phạm', <IconCheck key="i" width={16} height={16} />, 'neutral'],
  'report.resolve': ['Xử lý báo cáo', <IconFlag key="j" width={16} height={16} />, 'primary'],
  'report.reopen': ['Mở lại báo cáo', <IconFlag key="k" width={16} height={16} />, 'neutral'],
  'listing.hide': ['Ẩn tin', <IconHide key="l" width={16} height={16} />, 'error'],
  'listing.unhide': ['Hiện lại tin', <IconShow key="m" width={16} height={16} />, 'primary'],
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

export function Home() {
  const me = useMe()
  const admin = me.role === 'admin'
  return (
    <Shell title="Trang chủ">
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[1fr_280px]">
        {admin ? <ActionsCard /> : <RecentCard />}
        {admin ? <MembersCard /> : <ShortcutsCard />}
      </div>
    </Shell>
  )
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-hairline px-4 pb-2 pt-3">
      <h2 className="mb-2 text-title-small">{title}</h2>
      {children}
    </section>
  )
}

function ActionsCard() {
  const actions = useQuery({ queryKey: ['console', 'actions', 'latest'], queryFn: () => api<Page<Action>>('/console/actions?limit=8') })
  const cols = 'grid grid-cols-[56px_156px_148px_1fr] items-center gap-3'
  return (
    <Card title="Nhật ký thao tác">
      <div className={`${cols} px-2 pb-1.5 text-label-medium text-on-surface-variant`}>
        <span>Lúc</span>
        <span>Người làm</span>
        <span>Thao tác</span>
        <span>Đối tượng và lý do</span>
      </div>
      {actions.data?.items.map((a) => {
        const [label, icon, t] = kinds[a.action]
        const reason = typeof a.details?.reason === 'string' ? a.details.reason : ''
        return (
          <div key={a.id} className={`${cols} min-h-10 border-t border-hairline px-2 py-1.5 text-body-medium`}>
            <span className="text-on-surface-variant">{when(a.at)}</span>
            <span className="flex min-w-0 items-center gap-2">
              <Initial name={a.actor.display_name ?? 'CLI'} id={a.actor.member_id ?? 'cli'} size={20} member />
              <span className="truncate">{a.actor.display_name ?? 'CLI'}</span>
            </span>
            <span className={`inline-flex w-fit items-center gap-1 rounded-sm px-1.5 py-0.5 text-label-medium ${tone[t]}`}>
              {icon}
              {label}
            </span>
            <span className="flex min-w-0 items-baseline gap-2">
              <span className="shrink-0">
                {a.target.kind === 'account' ? 'Tài khoản' : a.target.kind === 'listing' ? 'Tin' : 'Nhân viên'}{' '}
                <span className="tabular-nums text-body-small text-on-surface-variant">{shortId(a.target.id)}</span>
              </span>
              {reason && <span className="min-w-0 truncate text-body-small text-on-surface-variant" title={reason}>{reason}</span>}
            </span>
          </div>
        )
      })}
      {actions.data?.items.length === 0 && <p className="border-t border-hairline px-2 py-3 text-body-medium text-on-surface-variant">Chưa có thao tác nào.</p>}
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
          <div key={m.id} className="flex items-center gap-3 rounded-md px-1 py-1.5">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                locked ? 'bg-error-container text-error' : 'bg-tertiary-fixed text-on-tertiary-fixed-variant'
              }`}
            >
              {locked ? <IconKey width={18} height={18} /> : <IconPhoneLock width={18} height={18} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-label-large">{m.display_name}</span>
              <span className="block text-body-small text-on-surface-variant">
                {locked ? `Khoá đăng nhập đến ${time.format(new Date(m.locked_until!))}` : 'Chưa bật 2 bước'}
              </span>
            </span>
            <IconChevron width={20} height={20} className="text-outline" />
          </div>
        )
      })}
      {toSee.data?.length === 0 && <p className="px-1 py-1.5 text-body-medium text-on-surface-variant">Không ai cần xử lý.</p>}
    </Card>
  )
}

function RecentCard() {
  const recent = useRecentAccounts()
  const navigate = useNavigate()
  return (
    <Card title="Vừa mở">
      {recent.map((a) => (
        <AccountRow key={a.id} a={a} onClick={() => navigate(`/accounts/${a.id}`)} right={<span className="text-body-small tabular-nums text-on-surface-variant">{when(a.opened)}</span>} />
      ))}
      {recent.length === 0 && <p className="border-t border-hairline px-2 py-3 text-body-medium text-on-surface-variant">Chưa mở tài khoản nào.</p>}
    </Card>
  )
}

const shortcuts: [string[], string][] = [
  [['/'], 'Tìm tài khoản'],
  [['j', 'k'], 'Lên, xuống trong danh sách'],
  [['Enter'], 'Mở bản ghi'],
  [['Esc'], 'Đóng panel bên cạnh'],
  [['['], 'Thu gọn, mở rộng thanh bên'],
]

function ShortcutsCard() {
  return (
    <Card title="Phím tắt">
      {shortcuts.map(([keys, text]) => (
        <div key={text} className="flex items-center justify-between py-1.5 text-body-medium">
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
