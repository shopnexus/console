import { type FormEvent, useCallback, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import IconSpark from '~icons/material-symbols/auto-awesome-outline-rounded'
import IconCopy from '~icons/material-symbols-light/content-copy-outline-rounded'
import IconCreated from '~icons/material-symbols-light/person-add-outline-rounded'
import IconLock from '~icons/material-symbols-light/lock-outline'
import IconLockClock from '~icons/material-symbols-light/lock-clock-outline-rounded'
import IconSearch from '~icons/material-symbols-light/search-rounded'
import IconUnlock from '~icons/material-symbols-light/lock-open-outline-rounded'
import IconVerified from '~icons/material-symbols-light/verified-rounded'
import IconVerifiedOutline from '~icons/material-symbols-light/verified-outline-rounded'
import IconHistory from '~icons/material-symbols-light/history-rounded'
import { Crumbs, DotFact, FactRow, Hero, JKHint, ListColumn, ListRow, Missing, StatusPill } from '../components/Panes'
import { Shell } from '../components/Shell'
import { Btn, Card, CardHead, IconTile, Initial, Kbd, Meter, Notice, Segmented, Tag } from '../components/ui'
import {
  type AccountDetail,
  type AccountTab,
  accountFailure,
  suspendTerms,
  termLabel,
  untilOf,
  rememberAccount,
  useAccountCommands,
  useAccountDetail,
  useAccountList,
  useAccountSearch,
} from '../lib/accounts'
import { useAskAgent } from '../lib/agent'
import { type Account, type Action, actionDetail, shortId } from '../lib/api'
import { useDismiss, useListKeys } from '../lib/dom'
import { count, DAY, date, day, firstName, stamp } from '../lib/format'

const daysLeft = (until: string, now: number) => Math.max(1, Math.ceil((new Date(until).getTime() - now) / DAY))

/** "7 days" for a suspension's term, from its action. */
function term(a: Action): string {
  const until = actionDetail(a, 'until')
  return until ? count(Math.max(1, Math.round((new Date(until).getTime() - new Date(a.at).getTime()) / DAY)), 'day') : 'with no end'
}

/** Accounts: the list, and the account in the URL beside it. */
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
  const isOpen = useCallback((a: Account) => a.id === id, [id])
  const close = useCallback(() => navigate('/accounts'), [navigate])
  useListKeys(rows, isOpen, open, id ? close : undefined)

  const total = suspended.data?.pages[0]?.total

  return (
    <Shell>
      <ListColumn
        width="w-[330px]"
        head={
          <>
            <Segmented
              full
              label="Accounts"
              value={tab}
              onChange={setTab}
              items={[
                { value: 'all', label: 'All' },
                {
                  value: 'suspended',
                  label: (
                    <>
                      Suspended
                      {total !== undefined && total > 0 && (
                        <span className="rounded-full bg-primary px-1.5 tabular-nums text-label-small text-on-primary">{total}</span>
                      )}
                    </>
                  ),
                },
              ]}
            />
            <form
              onSubmit={(e) => {
                e.preventDefault()
                setAsked(q.trim())
              }}
              className="flex h-10 items-center gap-2 rounded-full border border-hairline bg-surface-container-lowest px-4 text-on-surface-variant focus-within:border-primary/40"
            >
              <IconSearch width={17} height={17} />
              <input
                id="account-find"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value)
                  if (e.target.value === '') setAsked('')
                }}
                placeholder="Id or phone"
                aria-label="Find an account"
                className="h-full min-w-0 flex-1 bg-transparent text-body-medium text-on-surface outline-none placeholder:text-on-surface-variant"
              />
              <Kbd>/</Kbd>
            </form>
          </>
        }
        foot={<JKHint />}
      >
        <div key={asked ? 'found' : tab} className="rise-list space-y-1">
          {rows.map((a) => {
            const locked = a.status === 'suspended'
            return (
              <ListRow
                key={a.id}
                on={a.id === id}
                onClick={() => open(a)}
                avatar={<Initial name={a.display_name} id={a.id} size={38} status={a.status} />}
                name={a.display_name}
                when={day(a.created_at)}
                line={<span className="tabular-nums">{shortId(a.id)}</span>}
                foot={
                  locked ? (
                    <DotFact tone="bg-error">
                      {a.suspended_until ? `Suspended · ${daysLeft(a.suspended_until, now)} days left` : 'Suspended · no end'}
                    </DotFact>
                  ) : (
                    <DotFact tone="bg-primary">Active</DotFact>
                  )
                }
              />
            )
          })}
          {(asked ? found.data : list.data) && rows.length === 0 && (
            <p className="px-3 py-6 text-body-medium text-on-surface-variant">
              {asked ? 'No account matches.' : tab === 'suspended' ? 'No one is suspended.' : 'No accounts yet.'}
            </p>
          )}
          {!asked && list.hasNextPage && (
            <button
              onClick={() => list.fetchNextPage()}
              disabled={list.isFetchingNextPage}
              className="h-9 w-full rounded-full text-label-medium text-primary hover:bg-on-surface/5 disabled:opacity-60"
            >
              More
            </button>
          )}
        </div>
      </ListColumn>
      {id ? (
        <AccountPane
          key={id}
          id={id}
          onMove={(step) => {
            const at = rows.findIndex((a) => a.id === id)
            const next = rows[at + step]
            if (next) open(next)
          }}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center bg-surface-container-low/40 text-body-medium text-on-surface-variant">Pick an account</div>
      )}
    </Shell>
  )
}

function AccountPane({ id, onMove }: { id: string; onMove: (step: 1 | -1) => void }) {
  const detail = useAccountDetail(id)
  const navigate = useNavigate()
  const askAgent = useAskAgent()
  const commands = useAccountCommands(id)
  const [suspending, setSuspending] = useState(false)
  const closeSuspend = useCallback(() => setSuspending(false), [])
  // The button and its popover share one box, so a press on the button toggles.
  const suspendBox = useDismiss<HTMLDivElement>(suspending, closeSuspend)
  const [now] = useState(() => Date.now())

  if (detail.error) return <Missing error={detail.error} what="account" className="bg-surface-container-low/40" />
  if (!detail.data) return <div className="flex-1 bg-surface-container-low/40" />
  const { account: a, identities, actions } = detail.data
  const locked = a.status === 'suspended'
  const suspensions = actions.filter((x) => x.action === 'account.suspend')
  const failure = commands.suspend.error ?? commands.unsuspend.error
  const phone = identities.find((i) => i.kind === 'phone')
  const email = identities.find((i) => i.kind === 'email')

  return (
    <section className="relative flex min-w-0 flex-1 animate-pane flex-col bg-surface-container-low/40">
      <Crumbs parent="Accounts" onParent={() => navigate('/accounts')} name={a.display_name}>
        <button title="Previous (k)" onClick={() => onMove(-1)}>
          <Kbd>k</Kbd>
        </button>
        <button title="Next (j)" onClick={() => onMove(1)}>
          <Kbd>j</Kbd>
        </button>
      </Crumbs>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-6">
        <Hero>
          <div className="flex items-center gap-5">
            <Initial name={a.display_name} id={a.id} size={72} status={a.status} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-display-small">{a.display_name}</h1>
                <StatusPill suspended={locked}>{locked ? 'Suspended' : 'Active'}</StatusPill>
              </div>
              <p className="mt-0.5 flex items-center gap-1.5 text-body-small text-on-surface-variant">
                <span className="tabular-nums">{shortId(a.id)}</span>
                <button
                  title="Copy the id"
                  onClick={() => void navigator.clipboard?.writeText(a.id)}
                  className="flex h-5 w-5 items-center justify-center rounded-xs hover:bg-on-surface/5"
                >
                  <IconCopy width={14} height={14} />
                </button>
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {phone && (
                  <Tag tone="border border-hairline bg-surface-container-lowest text-primary">
                    <IconVerifiedOutline width={13} height={13} />
                    Phone verified
                  </Tag>
                )}
                {suspensions.length > (locked ? 1 : 0) && (
                  <Tag tone="border border-hairline bg-surface-container-lowest text-on-surface">
                    <IconHistory width={13} height={13} />
                    {count(suspensions.length - (locked ? 1 : 0), 'earlier suspension')}
                  </Tag>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {locked ? (
                <Btn
                  kind="primary"
                  big
                  icon={<IconUnlock width={17} height={17} />}
                  onClick={() => commands.unsuspend.mutate()}
                  disabled={commands.unsuspend.isPending}
                >
                  Lift suspension
                </Btn>
              ) : (
                <>
                  <Btn icon={<IconSpark width={17} height={17} />} onClick={() => void askAgent.ask({ kind: 'account', id })} disabled={askAgent.pending}>
                    Ask the agent
                  </Btn>
                  <div ref={suspendBox} className="relative">
                    <Btn
                      icon={<IconLock width={16} height={16} />}
                      onClick={() => setSuspending((s) => !s)}
                      aria-expanded={suspending}
                      className={suspending ? 'bg-on-surface/5 ring-4 ring-on-surface/5' : ''}
                    >
                      Suspend
                    </Btn>
                    {suspending && <SuspendPopover a={a} onClose={closeSuspend} suspend={commands.suspend} />}
                  </div>
                </>
              )}
            </div>
          </div>
        </Hero>
        {failure && <Notice>{accountFailure(failure)}</Notice>}
        {locked && <TermCard a={a} last={suspensions[0]} now={now} />}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_300px]">
          <Card>
            <CardHead title="History" />
            <History d={detail.data} />
          </Card>
          <Card className="p-5 pb-3">
            <CardHead title="Details" />
            <FactRow label="Phone">
              {phone ? (
                <span className="inline-flex items-center gap-1 tabular-nums">
                  {phone.value}
                  <IconVerified width={14} height={14} className="text-primary" />
                </span>
              ) : (
                '–'
              )}
            </FactRow>
            <FactRow label="Email">
              {email ? (
                <span className="inline-flex items-center gap-1">
                  {email.value}
                  <IconVerified width={14} height={14} className="text-primary" />
                </span>
              ) : (
                '–'
              )}
            </FactRow>
            <FactRow label="Joined">{date(a.created_at)}</FactRow>
          </Card>
        </div>
      </div>
    </section>
  )
}

/** A suspended account's term: the end, the days left, the time served, who suspended it. */
function TermCard({ a, last, now }: { a: Account; last?: Action; now: number }) {
  const until = a.suspended_until
  const start = last ? new Date(last.at).getTime() : undefined
  const served = until && start ? Math.min(100, Math.max(2, ((now - start) / (new Date(until).getTime() - start)) * 100)) : undefined
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2.5">
        <IconTile tone="bg-surface-container text-on-surface-variant">
          <IconLockClock width={18} height={18} />
        </IconTile>
        <p className="flex-1 text-title-small">{last ? `Suspended for ${term(last)}` : 'Suspended'}</p>
        {until && <p className="tabular-nums text-title-small">{daysLeft(until, now)} days left</p>}
      </div>
      {a.suspend_reason && <p className="mt-2 border-l-2 border-outline-variant pl-2.5 text-body-small text-on-surface-variant">{a.suspend_reason}</p>}
      {served !== undefined && (
        <div className="mt-3">
          <Meter pct={served} tone="bg-on-surface-variant" />
        </div>
      )}
      <div className="mt-2 flex justify-between text-body-small text-on-surface-variant">
        <span>{last ? `${day(last.at)} · by ${last.actor.display_name ?? 'CLI'}` : ''}</span>
        <span>{until ? `Ends ${day(until)}` : 'No end'}</span>
      </div>
    </Card>
  )
}

/** The console's suspensions and their ends, newest first, ending on the account's creation. */
function History({ d }: { d: AccountDetail }) {
  const rows = d.actions.filter((x) => x.action === 'account.suspend' || x.action === 'account.unsuspend')
  return (
    <ul className="rise-list relative before:absolute before:bottom-4 before:left-4 before:top-4 before:w-px before:bg-outline-variant/60">
      {rows.map((x) => {
        const suspend = x.action === 'account.suspend'
        const who = x.actor.display_name ?? 'CLI'
        const reason = actionDetail(x, 'reason')
        return (
          <li key={x.id} className="relative flex gap-3 pb-4 last:pb-0">
            <span
              className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-surface-container-lowest ${
                suspend ? 'bg-surface-container text-on-surface-variant' : 'bg-primary/8 text-primary'
              }`}
            >
              {suspend ? <IconLock width={16} height={16} /> : <IconUnlock width={16} height={16} />}
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex gap-2">
                <p className="flex flex-1 items-center gap-1.5 text-body-medium">
                  <Initial name={who} id={x.actor.member_id ?? 'cli'} size={18} member />
                  {suspend ? `${firstName(who)} suspended for ${term(x)}` : `${firstName(who)} lifted the suspension`}
                </p>
                <p className="tabular-nums text-body-small text-on-surface-variant">{stamp(x.at)}</p>
              </div>
              {reason && <p className="mt-1.5 border-l-2 border-primary/40 pl-2.5 text-body-small text-on-surface-variant">{reason}</p>}
            </div>
          </li>
        )
      })}
      <li className="relative flex items-center gap-3">
        <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-container text-on-surface-variant ring-4 ring-surface-container-lowest">
          <IconCreated width={16} height={16} />
        </span>
        <p className="flex-1 text-body-medium">Account created</p>
        <p className="tabular-nums text-body-small text-on-surface-variant">{day(d.account.created_at)}</p>
      </li>
    </ul>
  )
}

/** Suspend: the term with its end date, and the reason the person sees. */
function SuspendPopover({ a, onClose, suspend }: { a: Account; onClose: () => void; suspend: ReturnType<typeof useAccountCommands>['suspend'] }) {
  const [days, setDays] = useState<number | null>(7)
  const [reason, setReason] = useState('')
  const [now] = useState(() => Date.now())
  const label = termLabel(days)

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!reason.trim()) return
    suspend.mutate({ reason: reason.trim(), until: untilOf(days, now) }, { onSuccess: onClose })
  }

  return (
    <form
      onSubmit={submit}
      className="absolute right-0 top-full z-30 mt-2 w-[400px] origin-top-right animate-pop overflow-hidden rounded-5xl border border-hairline bg-surface-container-lowest shadow-float"
    >
      <div className="flex items-center gap-3 p-4">
        <IconTile size={40} tone="bg-surface-container text-on-surface-variant">
          <IconLock width={20} height={20} />
        </IconTile>
        <p className="min-w-0 flex-1 truncate text-title-medium">Suspend {a.display_name}</p>
      </div>
      <div role="radiogroup" aria-label="Term" className="grid grid-cols-2 gap-2 px-4">
        {suspendTerms.map(([n, text]) => (
          <button
            key={text}
            type="button"
            role="radio"
            aria-checked={days === n}
            onClick={() => setDays(n)}
            className={`rounded-2xl border p-3 text-left ${days === n ? 'border-primary bg-primary/4' : 'border-hairline hover:bg-surface-container-low'}`}
          >
            <span className={`block text-title-small ${days === n ? 'text-primary' : ''}`}>{text}</span>
            <span className="mt-0.5 block tabular-nums text-label-small font-normal text-on-surface-variant">
              {n === null ? 'until lifted' : `until ${day(now + n * DAY)}`}
            </span>
          </button>
        ))}
      </div>
      <div className="px-4 pt-3">
        <p className="mb-1.5 text-body-small text-on-surface-variant">Reason {a.display_name} sees</p>
        <textarea
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
          rows={3}
          aria-label="Reason"
          className="w-full resize-none rounded-2xl border border-hairline bg-transparent px-3.5 py-2.5 text-body-medium outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
        />
        <p className="mt-1 text-right tabular-nums text-label-small font-normal text-on-surface-variant">{reason.length}/500</p>
      </div>
      <div className="mt-3 flex items-center justify-end gap-2 border-t border-hairline bg-surface-container-low/60 p-3">
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn type="submit" kind="danger-fill" disabled={!reason.trim() || suspend.isPending}>
          Suspend {label}
        </Btn>
      </div>
    </form>
  )
}

