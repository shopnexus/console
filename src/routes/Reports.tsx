import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { listingStatus } from '../lib/commerce'
import IconSpark from '~icons/material-symbols/auto-awesome-outline-rounded'
import IconCheckCircle from '~icons/material-symbols-light/check-circle-outline-rounded'
import IconGavel from '~icons/material-symbols-light/gavel-rounded'
import IconPhoto from '~icons/material-symbols-light/image-outline-rounded'
import IconUndo from '~icons/material-symbols-light/undo-rounded'
import { Crumbs, DotFact, Hero, JKHint, ListColumn, ListError, ListRow, Missing, StatusPill } from '../components/Panes'
import { Select } from '../components/Select'
import { Shell } from '../components/Shell'
import { Btn, Card, CardHead, Check, Initial, Kbd, Notice, Segmented, Tag } from '../components/ui'
import { useAskAgent } from '../lib/agent'
import { suspendTerms, termLabel, untilOf } from '../lib/accounts'
import { shortId } from '../lib/api'
import { useListKeys } from '../lib/dom'
import { count, DAY, day, firstName, vnd, when } from '../lib/format'
import {
  type CaseStatus,
  type Decision,
  type ReportCase,
  type ReportCaseDetail,
  type ReportedListing,
  type ReportReason,
  caseFailure,
  reasonDot,
  reasonLabel,
  reasonsOf,
  useCase,
  useCaseCommands,
  useCases,
} from '../lib/reports'

const HOUR = 3_600_000

/** How long a case has waited: "40 min", "9 h", "3 d". */
const age = (iso: string, now: number) => {
  const ms = Math.max(0, now - new Date(iso).getTime())
  if (ms < HOUR) return `${Math.max(1, Math.round(ms / 60_000))} min`
  if (ms < DAY) return `${Math.round(ms / HOUR)} h`
  return `${Math.round(ms / DAY)} d`
}

const reasonTag: Record<ReportReason, string> = {
  scam: 'border border-hairline bg-surface-container-lowest text-on-surface',
  banned: 'border border-hairline bg-surface-container-lowest text-on-surface',
  fake: 'border border-hairline bg-surface-container-lowest text-on-surface-variant',
  other: 'border border-hairline bg-surface-container-lowest text-on-surface-variant',
}

/** Reports: the case queue, and the case of the account in the URL beside it. */
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
  const isOpen = useCallback((c: ReportCase) => c.account.id === id, [id])
  const close = useCallback(() => navigate('/reports'), [navigate])
  useListKeys(rows, isOpen, go, id ? close : undefined)

  return (
    <Shell>
      <ListColumn
        head={
          <Segmented
            full
            label="Cases"
            value={status}
            onChange={setStatus}
            items={[
              {
                value: 'open',
                label: (
                  <>
                    Waiting
                    {!!open.total && (
                      <span key={open.total} className="animate-badge rounded-full bg-primary px-1.5 tabular-nums text-label-small text-on-primary">
                        {open.total}
                      </span>
                    )}
                  </>
                ),
              },
              { value: 'resolved', label: 'Resolved' },
            ]}
          />
        }
        foot={<JKHint />}
      >
        <div key={status} className="rise-list space-y-1">
          <ListError error={cases.error} what="Cases" onRetry={() => void cases.refetch()} />
          {rows.map((c) => (
            <QueueRow key={c.account.id + (c.resolution?.at ?? '')} c={c} on={c.account.id === id} now={now} onClick={() => go(c)} />
          ))}
          {cases.data && rows.length === 0 && (
            <p className="px-3 py-6 text-body-medium text-on-surface-variant">{status === 'open' ? 'No case is waiting.' : 'No case resolved yet.'}</p>
          )}
          {cases.hasNextPage && (
            <button
              onClick={() => cases.fetchNextPage()}
              disabled={cases.isFetchingNextPage}
              className="h-9 w-full rounded-full text-label-medium text-primary hover:bg-on-surface/5 disabled:opacity-60"
            >
              More
            </button>
          )}
        </div>
      </ListColumn>
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
        <div className="flex flex-1 items-center justify-center bg-surface-container-low/40 text-body-medium text-on-surface-variant">Pick a case</div>
      )}
    </Shell>
  )
}

/** A case's initial with its report count as a badge, `error` from three. */
function CaseInitial({ name, id, reports, size = 38 }: { name: string; id: string; reports: number; size?: number }) {
  return (
    <span className="relative inline-flex">
      <Initial name={name} id={id} size={size} />
      <span
        className={`absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 tabular-nums text-label-small ring-2 ring-surface-container-lowest ${
          reports > 2 ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface'
        }`}
      >
        {reports}
      </span>
    </span>
  )
}

function QueueRow({ c, on, now, onClick }: { c: ReportCase; on: boolean; now: number; onClick: () => void }) {
  const overdue = !c.resolution && now - new Date(c.last_at).getTime() > DAY
  const r = c.resolution
  return (
    <ListRow
      on={on}
      onClick={onClick}
      avatar={<CaseInitial name={c.account.display_name} id={c.account.id} reports={c.reports} />}
      name={c.account.display_name}
      when={r ? `${firstName(r.by.display_name)} · ${when(r.at, now)}` : <span className={overdue ? 'font-medium text-primary' : ''}>{age(c.last_at, now)}</span>}
      line={c.listing?.title ?? 'Account'}
      foot={
        <>
          {reasonsOf(c.reasons)
            .slice(0, r ? 1 : 2)
            .map(([k]) => (
              <DotFact key={k} tone={reasonDot[k]}>
                {reasonLabel[k]}
              </DotFact>
            ))}
          {r && <span className={`ml-auto ${r.outcome === 'actioned' ? 'text-on-surface' : 'text-on-surface-variant'}`}>{r.outcome === 'actioned' ? 'Actioned' : 'No violation'}</span>}
        </>
      }
    />
  )
}

function CasePane({ id, now, onMove }: { id: string; now: number; onMove: (step: 1 | -1) => void }) {
  const detail = useCase(id)
  const navigate = useNavigate()
  const askAgent = useAskAgent()

  if (detail.error) return <Missing error={detail.error} what="case" gone="This account has no reports." className="bg-surface-container-low/40" />
  if (!detail.data) return <div className="flex-1 bg-surface-container-low/40" />
  const c = detail.data

  return (
    <section className="relative flex min-w-0 flex-1 animate-pane flex-col bg-surface-container-low/40">
      <Crumbs parent="Reports" onParent={() => navigate('/reports')} name={c.account.display_name}>
        <Btn icon={<IconSpark width={17} height={17} />} onClick={() => void askAgent.ask({ kind: 'account', id })} disabled={askAgent.pending}>
          Ask the agent
        </Btn>
        <button title="Previous (k)" onClick={() => onMove(-1)}>
          <Kbd>k</Kbd>
        </button>
        <button title="Next (j)" onClick={() => onMove(1)}>
          <Kbd>j</Kbd>
        </button>
      </Crumbs>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-32">
        <CaseHero c={c} />
        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[1fr_320px]">
          <div className="rise-list grid grid-cols-1 gap-3 lg:grid-cols-2">
            {c.listings.map((l) => (
              <ListingCard key={l.id} l={l} reports={c.reports.filter((r) => r.listing_id === l.id).length} />
            ))}
          </div>
          <Card className="p-4">
            <CardHead title="Reported by" right={<Tag tone="bg-surface-container text-on-surface">{c.reports.length}</Tag>} />
            <div className="rise-list">
              {c.reports.map((r) => (
                <div key={r.id} className="flex items-start gap-3 py-2">
                  <Initial name={r.reporter.display_name} id={r.reporter.id} size={30} />
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="text-label-medium">
                      {r.reporter.display_name} <span className="font-normal tabular-nums text-on-surface-variant">· {when(r.created_at, now)}</span>
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-body-small text-on-surface-variant">
                      <span className={`h-1.5 w-1.5 rounded-full ${reasonDot[r.reason]}`} />
                      {reasonLabel[r.reason]}
                    </p>
                    {/* What the reporter wrote stays as they wrote it. */}
                    {r.note && <p className="mt-0.5 text-body-small text-on-surface-variant">“{r.note}”</p>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
      {c.resolution ? <DoneBar c={c} now={now} /> : <DecisionBar c={c} />}
    </section>
  )
}

function CaseHero({ c }: { c: ReportCaseDetail }) {
  const navigate = useNavigate()
  const a = c.account
  const locked = a.status === 'suspended'
  const top = c.listings[0]
  return (
    <Hero>
      <div className="flex gap-5">
        <Initial name={a.display_name} id={a.id} size={72} status={a.status} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => navigate(`/accounts/${a.id}`)} className="text-display-small hover:underline">
              {a.display_name}
            </button>
            <StatusPill suspended={locked}>{locked ? (a.suspended_until ? `Suspended until ${day(a.suspended_until)}` : 'Suspended') : 'Active'}</StatusPill>
          </div>
          <p className="mt-0.5 tabular-nums text-body-small text-on-surface-variant">
            {shortId(a.id)} · since {day(a.created_at)} · {count(c.listings.length, 'listing')} reported
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {reasonsOf(c.reasons).map(([k, n]) => (
              <Tag key={k} tone={reasonTag[k]}>
                {reasonLabel[k]} · {n}
              </Tag>
            ))}
          </div>
        </div>
        {top && (
          <div className="hidden w-[300px] shrink-0 xl:block">
            <ListingCard l={top} reports={c.reports.filter((r) => r.listing_id === top.id).length} />
          </div>
        )}
      </div>
    </Hero>
  )
}

function ListingCard({ l, reports }: { l: ReportedListing; reports?: number }) {
  return (
    <Link to={`/listings/${l.id}`} className="flex items-center gap-3 rounded-3xl border border-hairline bg-surface-container-lowest p-3 shadow-soft hover:border-primary/30">
      {l.photo_url ? (
        <img src={l.photo_url} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
      ) : (
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-surface-container text-on-surface-variant">
          <IconPhoto width={22} height={22} />
        </span>
      )}
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-title-small">{l.title}</span>
        <span className="mt-0.5 block tabular-nums text-body-small font-medium text-on-surface">{vnd(l.price)}</span>
        <span className="mt-0.5 flex items-center gap-1.5 text-label-small font-normal text-on-surface-variant">
          <span className={l.status === 'hidden' ? 'font-medium text-on-surface' : ''}>{listingStatus[l.status] ?? l.status}</span>
          {reports !== undefined && reports > 0 && <span>· {count(reports, 'report')}</span>}
        </span>
      </span>
    </Link>
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
  const termText = termLabel(days)
  const failure = commands.decide.error ?? commands.dismiss.error
  const busy = commands.decide.isPending || commands.dismiss.isPending

  const hidePart = hide.length === 0 ? '' : hide.length === 1 ? 'Hide listing' : `Hide ${hide.length} listings`
  const label = hidePart && suspend ? `${hidePart} and suspend ${termText}` : hidePart || (suspend ? `Suspend ${termText}` : 'Pick what to do')
  const ready = (hide.length > 0 || suspend) && (!suspend || reason.trim() !== '')

  function apply() {
    const d: Decision = { hide }
    if (suspend) d.suspend = { reason: reason.trim(), until: untilOf(days, now) }
    commands.decide.mutate(d)
  }

  const toggle = (id: string) => setHide((h) => (h.includes(id) ? h.filter((x) => x !== id) : [...h, id]))
  const chip = 'flex shrink-0 items-center gap-2 rounded-full bg-surface-container-low px-3 py-2 text-label-medium font-normal'

  return (
    <div className="absolute inset-x-6 bottom-5 animate-rise space-y-2">
      {failure && <Notice>{caseFailure(failure)}</Notice>}
      <div className="flex flex-wrap items-center gap-3 rounded-4xl border border-hairline bg-surface-container-lowest p-3 shadow-float">
        {hideable.map((l) => (
          <button key={l.id} type="button" onClick={() => toggle(l.id)} title={l.title} className={`${chip} max-w-[220px]`}>
            <Check on={hide.includes(l.id)} />
            <span className="truncate">{hideable.length === 1 ? 'Hide listing' : `Hide ${l.title}`}</span>
          </button>
        ))}
        {!locked && (
          <span className={chip}>
            <button type="button" onClick={() => setSuspend((s) => !s)} className="flex items-center gap-2">
              <Check on={suspend} />
              Suspend
            </button>
            {suspend && (
              <span className="w-[112px]">
                <Select
                  size="sm"
                  label="Term"
                  value={days === null ? 'none' : String(days)}
                  onChange={(v) => setDays(v === 'none' ? null : Number(v))}
                  tone="border-hairline bg-surface-container-lowest text-on-surface"
                  options={suspendTerms.map(([n, t]) => ({ value: n === null ? 'none' : String(n), label: t }))}
                />
              </span>
            )}
          </span>
        )}
        {suspend ? (
          <input
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            placeholder={`Reason ${firstName(c.account.display_name)} sees`}
            aria-label="Reason the person sees"
            className="h-9 min-w-[150px] flex-1 rounded-full border border-hairline px-3.5 text-body-medium outline-none focus:border-primary/50"
          />
        ) : (
          <span className="flex-1" />
        )}
        <Btn onClick={() => commands.dismiss.mutate()} disabled={busy}>
          Not a violation
        </Btn>
        <Btn kind="danger-fill" big icon={<IconGavel width={17} height={17} />} onClick={apply} disabled={!ready || busy}>
          {label}
        </Btn>
      </div>
    </div>
  )
}

/** A resolved case: what was done, who and when, and Undo. */
function DoneBar({ c, now }: { c: ReportCaseDetail; now: number }) {
  const commands = useCaseCommands(c.account.id)
  const r = c.resolution!
  const hidden = c.listings.filter((l) => l.status === 'hidden').length
  const done =
    r.outcome === 'dismissed'
      ? ['No violation']
      : ([hidden > 0 && (hidden === 1 ? 'Hid the listing' : `Hid ${hidden} listings`), c.account.status === 'suspended' && 'Suspended the account'].filter(Boolean) as string[])
  return (
    <div className="absolute inset-x-6 bottom-5 animate-rise space-y-2">
      {commands.undo.error && <Notice>{caseFailure(commands.undo.error)}</Notice>}
      <div className="flex flex-wrap items-center gap-4 rounded-4xl border border-hairline bg-surface-container-low px-4 py-3">
        {(done.length ? done : ['Resolved']).map((t) => (
          <span key={t} className="inline-flex items-center gap-1.5 whitespace-nowrap text-body-medium">
            <IconCheckCircle width={17} height={17} className="text-primary" />
            {t}
          </span>
        ))}
        <span className="flex-1" />
        <span className="flex items-center gap-1.5 whitespace-nowrap text-body-small text-on-surface-variant">
          <Initial name={r.by.display_name} id={r.by.member_id} size={20} member />
          {r.by.display_name} · {when(r.at, now)}
        </span>
        <Btn icon={<IconUndo width={16} height={16} />} onClick={() => commands.undo.mutate(c)} disabled={commands.undo.isPending}>
          Undo
        </Btn>
      </div>
    </div>
  )
}
