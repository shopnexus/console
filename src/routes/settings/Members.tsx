import { type FormEvent, useCallback, useState } from 'react'
import IconMore from '~icons/material-symbols-light/more-horiz'
import IconMembers from '~icons/material-symbols-light/group-outline-rounded'
import IconMail from '~icons/material-symbols-light/mail-outline-rounded'
import IconPersonAdd from '~icons/material-symbols-light/person-add-outline-rounded'
import IconPerson from '~icons/material-symbols-light/person-outline-rounded'
import IconSearch from '~icons/material-symbols-light/search-rounded'
import IconShield from '~icons/material-symbols-light/shield-person-outline-rounded'
import IconCopy from '~icons/material-symbols-light/content-copy-outline-rounded'
import { SettingsShell } from '../../components/SettingsShell'
import { Btn, Card, Dot, IconBtn, Initial, Meter, Notice, Segmented, Tag } from '../../components/ui'
import { ApiError, type Member, roleName } from '../../lib/api'
import { useDismiss } from '../../lib/dom'
import { time, usd } from '../../lib/format'
import { useMe } from '../../lib/session'
import { useBudgets, useMemberCommands, useMembers, useSpend } from '../../lib/settings'

type Filter = 'all' | 'admin' | 'moderator'

/** Settings › Members: every console member, their role, status and spend this month, and what an admin can do to each. */
export function Members() {
  const members = useMembers()
  const spend = useSpend('30d')
  const budgets = useBudgets()
  const [filter, setFilter] = useState<Filter>('all')
  const [q, setQ] = useState('')
  const [inviting, setInviting] = useState(false)
  const closeInvite = useCallback(() => setInviting(false), [])
  const inviteBox = useDismiss<HTMLDivElement>(inviting, closeInvite)
  const [now] = useState(() => Date.now())
  const all = members.data?.items ?? []
  const needle = q.trim().toLowerCase()
  const rows = all.filter(
    (m) => (filter === 'all' || m.role === filter) && (!needle || m.display_name.toLowerCase().includes(needle) || m.email.toLowerCase().includes(needle)),
  )
  const locked = (m: Member) => !!m.locked_until && new Date(m.locked_until).getTime() > now

  return (
    <SettingsShell
      title="Members"
      icon={<IconMembers />}
      chips={[
        [<IconMembers key="a" width={16} height={16} />, `${all.length} people`],
        [<IconShield key="b" width={16} height={16} />, `${all.filter((m) => m.role === 'admin').length} admins`],
      ]}
      actions={
        <div ref={inviteBox} className="relative">
          <Btn kind="primary" icon={<IconPersonAdd width={17} height={17} />} onClick={() => setInviting((o) => !o)}>
            Add member
          </Btn>
          {inviting && <InvitePopover onClose={closeInvite} />}
        </div>
      }
    >
      <div className="mb-4 flex items-center gap-3">
        <Segmented
          label="Role"
          value={filter}
          onChange={setFilter}
          items={[
            { value: 'all', label: `All · ${all.length}` },
            { value: 'admin', label: `Admins · ${all.filter((m) => m.role === 'admin').length}` },
            { value: 'moderator', label: `Moderators · ${all.filter((m) => m.role === 'moderator').length}` },
          ]}
        />
        <span className="flex-1" />
        <label className="flex h-10 w-[280px] items-center gap-2 rounded-full border border-hairline bg-surface-container-lowest px-4 text-on-surface-variant focus-within:border-primary/40">
          <IconSearch width={18} height={18} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name or email"
            aria-label="Find a member"
            className="h-full min-w-0 flex-1 bg-transparent text-body-medium text-on-surface outline-none placeholder:text-on-surface-variant"
          />
        </label>
      </div>
      {members.error && <Notice>{members.error instanceof ApiError && members.error.status === 403 ? 'Admins only.' : 'Members did not load.'}</Notice>}
      <Card className="overflow-hidden p-0">
        <div className="flex items-center gap-5 border-b border-hairline bg-surface-container-low/60 px-5 py-3 text-body-small text-on-surface-variant">
          <span className="w-[280px]">Member</span>
          <span className="w-[150px]">Role</span>
          <span className="w-[170px]">Status</span>
          <span className="flex-1">30 days</span>
          <span className="w-8" />
        </div>
        <div className="rise-list">
          {rows.map((m) => {
            return (
              <div key={m.id} className="flex items-center gap-5 border-t border-hairline px-5 py-2.5 first:border-t-0 hover:bg-on-surface/3">
                <span className="flex w-[280px] min-w-0 items-center gap-3">
                  <Initial name={m.display_name} id={m.id} size={38} member={m.status === 'active'} />
                  <span className="min-w-0 leading-tight">
                    <span className="block truncate text-title-small">{m.display_name}</span>
                    <span className="block truncate text-body-small text-on-surface-variant">{m.email}</span>
                  </span>
                </span>
                <span className="w-[150px]">
                  <Tag tone={m.role === 'admin' ? 'bg-primary/8 text-primary' : 'bg-secondary-container/70 text-on-secondary-container'}>
                    {m.role === 'admin' ? <IconShield width={14} height={14} /> : <IconPerson width={14} height={14} />}
                    {roleName[m.role]}
                  </Tag>
                </span>
                <span className="w-[170px]">
                  {m.status === 'disabled' ? (
                    <Tag tone="bg-error-container text-error">Disabled</Tag>
                  ) : locked(m) ? (
                    <Tag tone="bg-surface-container text-on-surface">Locked until {time(m.locked_until!)}</Tag>
                  ) : (
                    <Tag>
                      <Dot />
                      Active
                    </Tag>
                  )}
                </span>
                <SpendCell
                  usd={spend.data?.members?.find((x) => x.member_id === m.id)?.usd}
                  daily={budgets.data?.overrides?.find((o) => o.member_id === m.id)?.daily_usd ?? budgets.data?.member_daily_usd?.[m.role]}
                />
                <MemberActions m={m} locked={locked(m)} />
              </div>
            )
          })}
          {members.data && rows.length === 0 && <p className="px-5 py-6 text-body-medium text-on-surface-variant">No member matches.</p>}
        </div>
      </Card>
    </SettingsShell>
  )
}

/** What a member spent in 30 days against their daily budget times 30. */
function SpendCell({ usd: spent, daily }: { usd?: number; daily?: number }) {
  if (spent === undefined) return <span className="flex-1 text-on-surface-variant">–</span>
  return (
    <span className="block w-[160px] flex-1">
      <span className="flex max-w-[160px] justify-between text-body-small">
        <span className="font-medium tabular-nums">{usd(spent)}</span>
        {daily !== undefined && <span className="tabular-nums text-on-surface-variant">${daily}/day</span>}
      </span>
      {daily ? <Meter pct={(spent / (daily * 30)) * 100} tone="bg-primary/70" className="mt-1.5 h-[5px] max-w-[160px]" /> : null}
    </span>
  )
}

/** The row's menu: unlock, reset the password, disable or enable. An admin cannot act on themself. */
function MemberActions({ m, locked }: { m: Member; locked: boolean }) {
  const me = useMe()
  const commands = useMemberCommands()
  const [open, setOpen] = useState(false)
  const [temp, setTemp] = useState<string>()
  const close = useCallback(() => {
    setOpen(false)
    setTemp(undefined)
  }, [])
  const ref = useDismiss<HTMLDivElement>(open, close)
  const failure = commands.disable.error ?? commands.enable.error ?? commands.unlock.error ?? commands.resetPassword.error
  if (m.id === me.id) return <span className="w-8" />
  const item = 'flex h-9 w-full items-center rounded-lg px-2.5 text-left text-label-medium font-normal hover:bg-surface-container-low disabled:opacity-50'
  return (
    <div ref={ref} className="relative">
      <IconBtn title="More" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <IconMore width={18} height={18} />
      </IconBtn>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-[240px] origin-top-right animate-pop rounded-3xl border border-hairline bg-surface-container-lowest p-1.5 shadow-float">
          {temp ? (
            <div className="p-2">
              <p className="text-body-small text-on-surface-variant">Temporary password, shown once</p>
              <p className="mt-1.5 flex items-center gap-2 rounded-xl bg-surface-container px-3 py-2 tabular-nums text-body-medium">
                <span className="min-w-0 flex-1 break-all">{temp}</span>
                <IconBtn title="Copy" onClick={() => void navigator.clipboard?.writeText(temp)}>
                  <IconCopy width={16} height={16} />
                </IconBtn>
              </p>
            </div>
          ) : (
            <>
              {locked && (
                <button className={item} disabled={commands.unlock.isPending} onClick={() => commands.unlock.mutate(m.id, { onSuccess: close })}>
                  Unlock sign-in
                </button>
              )}
              <button
                className={item}
                disabled={commands.resetPassword.isPending}
                onClick={() => commands.resetPassword.mutate(m.id, { onSuccess: (r) => setTemp(r.temporary_password) })}
              >
                Reset password
              </button>
              {m.status === 'active' ? (
                <button className={item} disabled={commands.disable.isPending} onClick={() => commands.disable.mutate(m.id, { onSuccess: close })}>
                  Disable
                </button>
              ) : (
                <button className={item} disabled={commands.enable.isPending} onClick={() => commands.enable.mutate(m.id, { onSuccess: close })}>
                  Enable
                </button>
              )}
              {failure && <p className="px-2.5 py-1.5 text-body-small text-error">That did not go through.</p>}
            </>
          )}
        </div>
      )}
    </div>
  )
}

/** Add member: a moderator with a temporary password they replace at the first sign-in. */
function InvitePopover({ onClose }: { onClose: () => void }) {
  const commands = useMemberCommands()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const created = commands.create.data
  function submit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim() || !name.trim()) return
    commands.create.mutate({ email: email.trim(), display_name: name.trim() })
  }
  const field = 'h-11 w-full rounded-xl border border-hairline bg-surface-container-lowest px-3.5 text-body-medium outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10'
  return (
    <form
      onSubmit={submit}
      className="absolute right-0 top-full z-30 mt-2 w-[360px] origin-top-right animate-pop space-y-3 rounded-4xl border border-hairline bg-surface-container-lowest p-4 shadow-float"
    >
      {created ? (
        <>
          <p className="text-title-small">{created.member.display_name} can sign in</p>
          <p className="text-body-small text-on-surface-variant">Temporary password, shown once</p>
          <p className="flex items-center gap-2 rounded-xl bg-surface-container px-3 py-2 tabular-nums text-body-medium">
            <span className="min-w-0 flex-1 break-all">{created.temporary_password}</span>
            <IconBtn title="Copy" onClick={() => void navigator.clipboard?.writeText(created.temporary_password)}>
              <IconCopy width={16} height={16} />
            </IconBtn>
          </p>
          <div className="flex justify-end">
            <Btn onClick={onClose}>Done</Btn>
          </div>
        </>
      ) : (
        <>
          <label className="block">
            <span className="mb-1.5 block text-body-small text-on-surface-variant">Name</span>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={100} className={field} />
          </label>
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1 text-body-small text-on-surface-variant">
              <IconMail width={14} height={14} />
              Email
            </span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} className={field} />
          </label>
          <p className="text-body-small text-on-surface-variant">Joins as a {roleName.moderator.toLowerCase()}.</p>
          {commands.create.error && (
            <p className="text-body-small text-error">
              {commands.create.error instanceof ApiError && commands.create.error.status === 409 ? 'That email is taken.' : 'That did not go through.'}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Btn onClick={onClose}>Cancel</Btn>
            <Btn type="submit" kind="primary" disabled={!email.trim() || !name.trim() || commands.create.isPending}>
              Add
            </Btn>
          </div>
        </>
      )}
    </form>
  )
}
