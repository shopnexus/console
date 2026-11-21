import { type FormEvent, type ReactNode, useEffect, useState } from 'react'
import { Link } from 'react-router'
import IconBlock from '~icons/material-symbols-light/block-rounded'
import IconCheck from '~icons/material-symbols-light/check-rounded'
import IconClose from '~icons/material-symbols-light/close-rounded'
import IconCopy from '~icons/material-symbols-light/content-copy-outline-rounded'
import IconEdit from '~icons/material-symbols-light/edit-outline-rounded'
import IconLock from '~icons/material-symbols-light/lock-clock-outline-rounded'
import IconLogin from '~icons/material-symbols-light/login-rounded'
import IconPassword from '~icons/material-symbols-light/password-rounded'
import IconPersonAdd from '~icons/material-symbols-light/person-add-outline-rounded'
import IconPerson from '~icons/material-symbols-light/person-outline-rounded'
import IconShield from '~icons/material-symbols-light/shield-person-outline-rounded'
import IconClock from '~icons/material-symbols-light/schedule-outline-rounded'
import IconTerminal from '~icons/material-symbols-light/terminal-rounded'
import IconVerified from '~icons/material-symbols-light/verified-user-outline-rounded'
import { lookOf, targetLabel } from '../../components/actionLook'
import { MoneyField } from '../../components/MoneyField'
import { Btn, Confirm, IconBtn, Initial, Meter, Tag } from '../../components/ui'
import { useActions } from '../../lib/actions'
import { type Member, actionDetail, roleName } from '../../lib/api'
import { useCopy, useDismiss } from '../../lib/dom'
import { date, firstName, int, time, usd, when } from '../../lib/format'
import { lastSignIn, type SignIn, signInOf, signInText } from '../../lib/members'
import { settingsFailure, useBudgets, useMemberCommands, useSettingsCommands, useSpend } from '../../lib/settings'

const failed = 'That did not go through.'

export function RoleTag({ role }: { role: Member['role'] }) {
  return (
    <Tag tone={role === 'admin' ? 'bg-primary/8 text-primary' : 'bg-secondary-container/70 text-on-secondary-container'}>
      {role === 'admin' ? <IconShield width={14} height={14} /> : <IconPerson width={14} height={14} />}
      {roleName[role]}
    </Tag>
  )
}

const signInLooks: Record<SignIn, { icon: ReactNode; tone: string }> = {
  disabled: { icon: <IconBlock width={14} height={14} />, tone: 'bg-surface-container-high text-on-surface-variant' },
  locked: { icon: <IconLock width={14} height={14} />, tone: 'bg-primary/8 text-primary' },
  never: { icon: <IconClock width={14} height={14} />, tone: 'bg-surface-container text-on-surface-variant' },
  reset: { icon: <IconClock width={14} height={14} />, tone: 'bg-surface-container text-on-surface-variant' },
  ok: { icon: null, tone: '' },
}

/** The sign-in state: plain text when fine, a tag when it waits on something. */
export function SignInTag({ m }: { m: Member }) {
  const s = signInOf(m)
  if (s === 'ok')
    return (
      <span className="flex items-center gap-1.5 text-body-small text-on-surface-variant">
        <IconVerified width={16} height={16} className="text-primary" />
        {signInText(m, s)}
      </span>
    )
  return (
    <Tag tone={signInLooks[s].tone}>
      {signInLooks[s].icon}
      {signInText(m, s)}
    </Tag>
  )
}

/**
 * One member, over the page: rename, sign-in, the daily agent budget, the
 * member's recent actions, and disable. Admins are managed from the server's
 * CLI, so their panel has no access actions.
 */
export function MemberPanel({ m, onClose }: { m: Member; onClose: () => void }) {
  const ref = useDismiss<HTMLElement>(true, onClose)
  useEffect(() => ref.current?.focus(), [ref])
  const managed = m.role === 'moderator'
  return (
    <>
      <div className="fixed inset-0 z-30 bg-on-surface/12" aria-hidden />
      <aside
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-label={m.display_name}
        className="fixed inset-y-0 right-0 z-40 flex w-[440px] max-w-full animate-panel flex-col bg-surface-container-lowest shadow-float outline-none"
      >
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Head m={m} managed={managed} onClose={onClose} />
          <SignIn m={m} managed={managed} />
          <Budget m={m} />
          <RecentActions m={m} />
        </div>
        {managed && <Access m={m} />}
      </aside>
    </>
  )
}

function Section({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-t border-hairline px-6 py-5">
      <div className="mb-3 flex items-center gap-2">
        <h3 className="flex-1 text-label-medium font-normal text-on-surface-variant">{title}</h3>
        {right}
      </div>
      {children}
    </section>
  )
}

function Line({ icon, label, value, action }: { icon: ReactNode; label: string; value: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex min-h-11 items-center gap-3 py-1">
      <span className="text-on-surface-variant">{icon}</span>
      <span className="flex-1 text-body-medium">{label}</span>
      <span className="text-body-small text-on-surface-variant">{value}</span>
      {action}
    </div>
  )
}

function Small(props: { onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return <Btn {...props} className="h-8 px-3 text-label-small" />
}

/** A secret the server shows once, with a copy button. */
export function CopyOnce({ secret }: { secret: string }) {
  const [copied, copy] = useCopy()
  return (
    <div className="rounded-2xl bg-surface-container px-4 py-3">
      <p className="text-body-small text-on-surface-variant">Temporary password, shown once</p>
      <p className="mt-1 flex items-center gap-2">
        <span className="min-w-0 flex-1 break-all font-mono text-body-large tabular-nums">{secret}</span>
        <IconBtn title={copied ? 'Copied' : 'Copy'} onClick={() => copy(secret)}>
          {copied ? <IconCheck width={16} height={16} /> : <IconCopy width={16} height={16} />}
        </IconBtn>
      </p>
      <p className="mt-1 text-body-small text-on-surface-variant">They set their own at the next sign-in.</p>
    </div>
  )
}

function Head({ m, managed, onClose }: { m: Member; managed: boolean; onClose: () => void }) {
  const { rename } = useMemberCommands()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(m.display_name)
  function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || name.trim() === m.display_name) return setEditing(false)
    rename.mutate({ id: m.id, display_name: name.trim() }, { onSuccess: () => setEditing(false) })
  }
  return (
    <div className="flex items-start gap-4 px-6 pb-5 pt-6">
      <Initial name={m.display_name} id={m.id} size={56} member={m.status === 'active'} />
      <div className="min-w-0 flex-1 pt-0.5">
        {editing ? (
          <form onSubmit={submit} className="flex items-center gap-1.5">
            <input
              autoFocus
              aria-label="Name"
              value={name}
              maxLength={100}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Escape') return
                e.stopPropagation()
                setEditing(false)
              }}
              className="h-9 min-w-0 flex-1 rounded-xl border border-primary/50 bg-surface-container-lowest px-3 text-title-medium outline-none ring-4 ring-primary/10"
            />
            <Btn type="submit" kind="primary" className="h-9 px-3" disabled={rename.isPending}>
              Save
            </Btn>
          </form>
        ) : (
          <p className="flex items-center gap-1">
            <span className="truncate text-title-large">{m.display_name}</span>
            {managed && (
              <IconBtn title="Rename" onClick={() => setEditing(true)}>
                <IconEdit width={16} height={16} />
              </IconBtn>
            )}
          </p>
        )}
        {rename.error && <p className="mt-1 text-body-small text-error">{settingsFailure(rename.error)}</p>}
        <p className="truncate text-body-small text-on-surface-variant">
          {m.email} · joined {date(m.created_at)}
        </p>
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <RoleTag role={m.role} />
          <SignInTag m={m} />
        </div>
      </div>
      <IconBtn title="Close" onClick={onClose} className="-mr-2 -mt-1 h-9 w-9">
        <IconClose width={20} height={20} />
      </IconBtn>
    </div>
  )
}

/** Sign-in: the moderator's resets and unlock, or for an admin the CLI that manages them. */
function SignIn({ m, managed }: { m: Member; managed: boolean }) {
  const commands = useMemberCommands()
  const temp = commands.resetPassword.data?.temporary_password
  const error = commands.unlock.error ?? commands.resetPassword.error ?? commands.resetTotp.error
  const acts = managed && m.status === 'active'
  return (
    <Section title="Sign-in">
      {temp && (
        <div className="mb-2">
          <CopyOnce secret={temp} />
        </div>
      )}
      {managed && signInOf(m) === 'locked' && (
        <Line
          icon={<IconLock width={19} height={19} />}
          label="Locked after wrong tries"
          value={`until ${time(m.locked_until!)}`}
          action={
            <Small onClick={() => commands.unlock.mutate(m.id)} disabled={commands.unlock.isPending}>
              Unlock
            </Small>
          }
        />
      )}
      {managed && (
        <Line
          icon={<IconPassword width={19} height={19} />}
          label="Password"
          value={m.must_change_password ? 'Temporary' : 'Their own'}
          action={
            acts &&
            !temp && (
              <Small onClick={() => commands.resetPassword.mutate(m.id)} disabled={commands.resetPassword.isPending}>
                Reset
              </Small>
            )
          }
        />
      )}
      <Line
        icon={<IconVerified width={19} height={19} />}
        label="Two-step sign-in"
        value={m.totp_enrolled ? 'On' : 'Not set up'}
        action={
          acts &&
          m.totp_enrolled && (
            <Small onClick={() => commands.resetTotp.mutate(m.id)} disabled={commands.resetTotp.isPending}>
              Reset
            </Small>
          )
        }
      />
      <Line icon={<IconLogin width={19} height={19} />} label="Last sign-in" value={lastSignIn(m)} />
      {error && <p className="mt-1 text-body-small text-error">{failed}</p>}
      {!managed && (
        <div className="mt-2 rounded-2xl bg-surface-container-low px-4 py-3.5">
          <p className="flex items-center gap-2 text-label-medium">
            <IconTerminal width={18} height={18} className="text-primary" />
            Managed from the server
          </p>
          <p className="mt-1 text-body-small text-on-surface-variant">An admin resets another admin’s password, two-step or access with the console CLI on the server.</p>
          <p className="mt-2.5 truncate rounded-xl bg-surface-container-lowest px-3 py-2 font-mono text-body-small">console reset-password --email {m.email}</p>
        </div>
      )}
    </Section>
  )
}

/** The member's daily budget through the console agents: their own, or their role's when left empty. */
function Budget({ m }: { m: Member }) {
  const budgets = useBudgets()
  const spend = useSpend('30d')
  const { updateBudgets } = useSettingsCommands()
  if (!budgets.data) return null
  const overrides = budgets.data.overrides ?? []
  const own = overrides.find((o) => o.member_id === m.id)?.daily_usd
  const roleDaily = budgets.data.member_daily_usd?.[m.role]
  const daily = own ?? roleDaily
  const spent = spend.data?.members?.find((x) => x.member_id === m.id)
  // Overrides are replaced as a list; empty drops the member's own.
  const save = (v?: number) =>
    updateBudgets.mutate({ overrides: [...overrides.filter((o) => o.member_id !== m.id), ...(v === undefined ? [] : [{ member_id: m.id, daily_usd: v }])] })
  return (
    <Section title="Agent budget">
      <div className="flex items-center gap-3">
        <span className="flex-1 text-body-medium">Daily limit</span>
        <MoneyField
          key={own}
          value={own}
          label={`${m.display_name}'s daily budget`}
          suffix="/day"
          placeholder={roleDaily === undefined ? 'None' : `${roleDaily} role`}
          className="w-[150px]"
          onSave={save}
        />
      </div>
      {updateBudgets.error && <p className="mt-2 text-body-small text-error">{settingsFailure(updateBudgets.error)}</p>}
      {spent && (
        <>
          <p className="mt-4 flex justify-between text-body-small">
            <span>
              <span className="font-medium tabular-nums">{usd(spent.usd)}</span> <span className="text-on-surface-variant">and {int(spent.requests)} questions in 30 days</span>
            </span>
            {daily ? <span className="tabular-nums text-on-surface-variant">of ${daily * 30}</span> : null}
          </p>
          {daily ? <Meter pct={(spent.usd / (daily * 30)) * 100} tone="bg-primary/70" className="mt-1.5 h-1.5" /> : null}
        </>
      )}
    </Section>
  )
}

function RecentActions({ m }: { m: Member }) {
  const log = useActions(m.id)
  const items = log.items?.slice(0, 5) ?? []
  return (
    <Section
      title="Recent actions"
      right={
        <Link to={`/settings/audit?member=${m.id}`} className="text-label-small text-primary hover:underline">
          Audit log
        </Link>
      }
    >
      {log.error && <p className="text-body-small text-error">The actions did not load.</p>}
      {log.data && items.length === 0 && <p className="text-body-small text-on-surface-variant">No actions yet.</p>}
      <div className="relative before:absolute before:bottom-4 before:left-4 before:top-4 before:w-px before:bg-outline-variant/50">
        {items.map((a) => {
          const [verb, icon, tone] = lookOf(a.action)
          const reason = actionDetail(a, 'reason')
          return (
            <div key={a.id} className="relative flex gap-3 pb-4 last:pb-0">
              <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-surface-container-lowest ${tone}`}>{icon}</span>
              <div className="min-w-0 flex-1 pt-1 leading-tight">
                <p className="text-body-medium">
                  {verb[0].toUpperCase() + verb.slice(1)}{' '}
                  <span className="text-primary">{targetLabel(a)}</span>
                </p>
                {reason && <p className="mt-0.5 truncate text-body-small text-on-surface-variant">{reason}</p>}
              </div>
              <span className="pt-1 tabular-nums text-body-small text-on-surface-variant">{when(a.at)}</span>
            </div>
          )
        })}
      </div>
    </Section>
  )
}

/** Disable asks first; Enable does not. */
function Access({ m }: { m: Member }) {
  const commands = useMemberCommands()
  const [asking, setAsking] = useState(false)
  const first = firstName(m.display_name)
  const error = commands.disable.error ?? commands.enable.error
  if (m.status === 'disabled')
    return (
      <div className="border-t border-hairline px-6 py-4">
        <Btn icon={<IconPersonAdd width={17} height={17} />} onClick={() => commands.enable.mutate(m.id)} disabled={commands.enable.isPending}>
          Enable member
        </Btn>
        {error && <p className="mt-2 text-body-small text-error">{failed}</p>}
      </div>
    )
  if (!asking)
    return (
      <div className="border-t border-hairline px-6 py-4">
        <Btn icon={<IconBlock width={17} height={17} />} onClick={() => setAsking(true)}>
          Disable member
        </Btn>
      </div>
    )
  return (
    <Confirm
      className="border-t border-hairline bg-surface-container-low/60 px-6 py-5"
      title={`Disable ${first}?`}
      error={error && failed}
      confirm="Disable"
      busy={commands.disable.isPending}
      onCancel={() => setAsking(false)}
      onConfirm={() => commands.disable.mutate(m.id, { onSuccess: () => setAsking(false) })}
    >
      {first} is signed out everywhere now and can't sign in. Enable brings the same password back.
    </Confirm>
  )
}
