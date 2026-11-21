import { type FormEvent, useCallback, useState } from 'react'
import { useSearchParams } from 'react-router'
import IconMembers from '~icons/material-symbols-light/group-outline-rounded'
import IconAttention from '~icons/material-symbols-light/error-outline-rounded'
import IconChevron from '~icons/material-symbols-light/chevron-right-rounded'
import IconMail from '~icons/material-symbols-light/mail-outline-rounded'
import IconPersonAdd from '~icons/material-symbols-light/person-add-outline-rounded'
import IconShield from '~icons/material-symbols-light/shield-person-outline-rounded'
import { SearchPill, SettingsShell } from '../../components/SettingsShell'
import { Btn, Card, Initial, Meter, Notice, Segmented } from '../../components/ui'
import { ApiError, type Member, roleName } from '../../lib/api'
import { useDismiss } from '../../lib/dom'
import { usd } from '../../lib/format'
import { lastSignIn, needsAttention } from '../../lib/members'
import { useMe } from '../../lib/session'
import { useBudgets, useMemberCommands, useMembers, useSpend } from '../../lib/settings'
import { CopyOnce, MemberPanel, RoleTag, SignInTag } from './MemberPanel'

type Filter = 'all' | 'admin' | 'moderator' | 'attention'

/** Settings › Members: every console member, how they sign in and their agent spend; a row opens the member's panel. */
export function Members() {
  const members = useMembers()
  const spend = useSpend('30d')
  const budgets = useBudgets()
  const me = useMe()
  const [params, setParams] = useSearchParams()
  const [filter, setFilter] = useState<Filter>('all')
  const [q, setQ] = useState('')
  const [inviting, setInviting] = useState(false)
  const closeInvite = useCallback(() => setInviting(false), [])
  const inviteBox = useDismiss<HTMLDivElement>(inviting, closeInvite)
  const all = members.data?.items ?? []
  const attention = all.filter((m) => needsAttention(m))
  const needle = q.trim().toLowerCase()
  const rows = all.filter(
    (m) =>
      (filter === 'attention' ? needsAttention(m) : filter === 'all' || m.role === filter) &&
      (!needle || m.display_name.toLowerCase().includes(needle) || m.email.toLowerCase().includes(needle)),
  )
  const admins = all.filter((m) => m.role === 'admin').length
  const daily = (m: Member) => budgets.data?.overrides?.find((o) => o.member_id === m.id)?.daily_usd ?? budgets.data?.member_daily_usd?.[m.role]
  const open = all.find((m) => m.id === params.get('member'))
  const pick = useCallback((id?: string) => setParams(id ? { member: id } : {}, { replace: true }), [setParams])

  return (
    <SettingsShell
      title="Members"
      icon={<IconMembers />}
      chips={[
        [<IconMembers key="a" width={16} height={16} />, `${all.length} people`],
        [<IconShield key="b" width={16} height={16} />, `${admins} admins`],
        attention.length > 0 && [<IconAttention key="c" width={16} height={16} />, `${attention.length} need attention`],
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
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented
          label="Role"
          value={filter === 'attention' ? 'all' : filter}
          onChange={setFilter}
          items={[
            { value: 'all', label: `All · ${all.length}` },
            { value: 'admin', label: `Admins · ${admins}` },
            { value: 'moderator', label: `Moderators · ${all.length - admins}` },
          ]}
        />
        {attention.length > 0 && (
          <button
            type="button"
            aria-pressed={filter === 'attention'}
            onClick={() => setFilter((f) => (f === 'attention' ? 'all' : 'attention'))}
            className={`flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-label-medium ${
              filter === 'attention' ? 'border-primary/40 bg-primary/8 text-primary' : 'border-hairline bg-surface-container-lowest font-normal text-on-surface-variant hover:bg-on-surface/4'
            }`}
          >
            <IconAttention width={17} height={17} />
            Needs attention
            <span className="rounded-full bg-primary px-1.5 text-label-small tabular-nums text-on-primary">{attention.length}</span>
          </button>
        )}
        <span className="flex-1" />
        <SearchPill value={q} onChange={setQ} placeholder="Name or email" label="Find a member" className="w-[260px]" />
      </div>
      {members.error && <Notice>{members.error instanceof ApiError && members.error.status === 403 ? 'Admins only.' : 'Members did not load.'}</Notice>}
      <Card className="overflow-hidden p-0">
        <div className="flex items-center gap-5 border-b border-hairline bg-surface-container-low/60 px-5 py-3 text-body-small text-on-surface-variant">
          <span className="w-[250px]">Member</span>
          <span className="w-[120px]">Role</span>
          <span className="w-[190px]">Sign-in</span>
          <span className="w-[110px]">Last sign-in</span>
          <span className="flex-1">30 days</span>
          <span className="w-[18px]" />
        </div>
        <div className="rise-list">
          {rows.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => pick(m.id)}
              className={`flex w-full items-center gap-5 border-t border-hairline px-5 py-2.5 text-left first:border-t-0 ${open?.id === m.id ? 'bg-primary/6' : 'hover:bg-on-surface/3'}`}
            >
              <span className="flex w-[250px] min-w-0 items-center gap-3">
                <Initial name={m.display_name} id={m.id} size={38} member={m.status === 'active'} />
                <span className="min-w-0 leading-tight">
                  <span className="block truncate text-title-small">
                    {m.display_name}
                    {m.id === me.id && <span className="ml-1.5 text-body-small text-on-surface-variant">You</span>}
                  </span>
                  <span className="block truncate text-body-small text-on-surface-variant">{m.email}</span>
                </span>
              </span>
              <span className="w-[120px]">
                <RoleTag role={m.role} />
              </span>
              <span className="w-[190px]">
                <SignInTag m={m} />
              </span>
              <span className={`w-[110px] text-body-small ${m.last_sign_in_at ? '' : 'text-on-surface-variant'}`}>{lastSignIn(m)}</span>
              <SpendCell usd={spend.data?.members?.find((x) => x.member_id === m.id)?.usd} daily={daily(m)} />
              <IconChevron width={18} height={18} className="text-on-surface-variant" />
            </button>
          ))}
          {members.data && rows.length === 0 && <p className="px-5 py-6 text-body-medium text-on-surface-variant">No member matches.</p>}
        </div>
      </Card>
      {open && (
        <MemberPanel key={open.id} m={open} onClose={() => pick()} />
      )}
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
          <CopyOnce secret={created.temporary_password} />
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
