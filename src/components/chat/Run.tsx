import { type ReactNode, useState } from 'react'
import IconSpark from '~icons/material-symbols/auto-awesome-outline-rounded'
import IconBlock from '~icons/material-symbols-light/do-not-disturb-on-outline-rounded'
import IconBadge from '~icons/material-symbols-light/badge-outline'
import IconCheck from '~icons/material-symbols-light/check-rounded'
import IconClose from '~icons/material-symbols-light/close-rounded'
import IconCompress from '~icons/material-symbols-light/compress-rounded'
import IconError from '~icons/material-symbols-light/error-outline-rounded'
import IconExpand from '~icons/material-symbols-light/expand-more-rounded'
import IconHourglass from '~icons/material-symbols-light/hourglass-top-rounded'
import IconLoop from '~icons/material-symbols-light/all-inclusive-rounded'
import IconPause from '~icons/material-symbols-light/pause-rounded'
import IconReason from '~icons/material-symbols-light/psychology-outline-rounded'
import IconSchedule from '~icons/material-symbols-light/schedule-outline-rounded'
import IconShield from '~icons/material-symbols-light/verified-user-outline-rounded'
import IconSpeed from '~icons/material-symbols-light/speed-outline-rounded'
import IconSwap from '~icons/material-symbols-light/swap-horiz-rounded'
import { useNow } from '../../lib/dom'
import { clock, duration, time } from '../../lib/format'
import { reducedMotion, useArrival } from '../../lib/motion'
import { usePanel } from '../../lib/panel'
import { counts, elapsed, flatTools, isLive, type Note, type RunState, type Step, type ToolCall } from '../../lib/run'
import { Spinner } from '../ui'

/** A tool call as a quiet chip (a border only on hover): its state, the tool, what it was called on and what came back. A press opens the tool panel. */
export function ToolChip({ call, count, onPress }: { call: ToolCall; count?: string; onPress?: () => void }) {
  const { open, panel } = usePanel()
  const on = panel?.kind === 'tool' && panel.id === call.id
  const failed = call.status === 'failed'
  const icon =
    call.status === 'running' ? (
      call.retries.length ? <IconHourglass width={13} height={13} className="text-tertiary" /> : <Spinner size={11} />
    ) : failed ? (
      <IconError width={13} height={13} />
    ) : call.status === 'skipped' ? (
      <IconSchedule width={13} height={13} className="text-outline" />
    ) : (
      <IconCheck width={13} height={13} className="text-primary" />
    )
  return (
    <button
      type="button"
      onClick={onPress ?? (() => open(on ? undefined : { kind: 'tool', id: call.id }))}
      className={`inline-flex h-7 max-w-full items-center gap-1.5 rounded-[9px] border px-2 text-label-small font-normal ${
        failed
          ? 'border-error/30 bg-error/4 text-error'
          : on
            ? 'border-primary/40 bg-primary/4'
            : 'border-transparent bg-surface-container-low hover:border-hairline hover:bg-surface-container-lowest'
      }`}
    >
      {icon}
      <span className="font-medium">{call.tool}</span>
      {call.label && !count && <span className={`truncate ${failed ? '' : 'text-on-surface-variant'}`}>{call.label}</span>}
      {count && <span className="rounded-[5px] bg-surface-container-high px-1 text-[11px] font-semibold">{count}</span>}
      {call.resultSummary && !count && <span className={failed ? 'opacity-80' : 'text-on-surface-variant'}>→ {call.resultSummary}</span>}
    </button>
  )
}

/** A step's calls: up to three of one tool each as a chip, more as "tool ×n" that opens to them. */
function StepTools({ calls }: { calls: ToolCall[] }) {
  const [unfolded, setUnfolded] = useState<string[]>([])
  const byTool = new Map<string, ToolCall[]>()
  for (const c of calls) byTool.set(c.tool, [...(byTool.get(c.tool) ?? []), c])
  const out: ReactNode[] = []
  for (const [tool, list] of byTool) {
    if (list.length > 3 && !unfolded.includes(tool)) {
      const running = list.filter((c) => c.status === 'running').length
      const lead = list.find((c) => c.status === 'running') ?? list[0]
      out.push(
        <ToolChip
          key={tool}
          call={{ ...lead, label: '' }}
          count={running ? `${list.length - running}/${list.length}` : `×${list.length}`}
          onPress={() => setUnfolded((t) => [...t, tool])}
        />,
      )
    } else for (const c of list) out.push(<ToolChip key={c.id} call={c} />)
  }
  return <div className="mt-2 flex flex-wrap gap-1.5">{out}</div>
}

const guardText: Record<string, [string, (s: number) => ReactNode]> = {
  pii_masked: ['Personal data masked', (s) => <IconBadge width={s} height={s} />],
  off_topic: ['Refused off-topic', (s) => <IconBlock width={s} height={s} />],
  loop_stopped: ['Stopped a loop', (s) => <IconLoop width={s} height={s} />],
  rate_limited: ['Rate limited', (s) => <IconSpeed width={s} height={s} />],
}

/** A provider switch or a guardrail inside the run, as a quiet line. */
export function NoteView({ note }: { note: Note }) {
  if (note.kind === 'switch') {
    return (
      <p className="mt-2 flex items-start gap-2 text-body-small text-on-tertiary-fixed-variant">
        <IconSwap width={16} height={16} className="mt-0.5 shrink-0" />
        <span>
          {note.from} returned {note.reason}; switched to {note.to}, same model
        </span>
      </p>
    )
  }
  // Rules the console has no words for yet show by their name.
  const [title, icon] = guardText[note.rule] ?? [note.rule.replace(/_/g, ' '), (s: number) => <IconShield width={s} height={s} />]
  return (
    <p className="mt-2 flex items-start gap-2 text-body-small text-primary">
      <span className="mt-0.5 shrink-0">{icon(16)}</span>
      <span>
        <span className="font-medium">{title}</span>
        {note.detail && <span className="text-on-surface-variant"> · {note.detail}</span>}
      </span>
    </p>
  )
}

/** A call's failed attempts and the next one, while the run retries it. */
function Attempts({ call, now }: { call: ToolCall; now: number }) {
  if (call.retries.length === 0) return null
  const last = call.retries[call.retries.length - 1]
  const nextAt = new Date(last.at).getTime() + last.next_in_ms
  return (
    <div className="mt-2 space-y-1 text-body-small">
      {call.retries.map((r) => (
        <p key={r.attempt} className="flex items-center gap-2">
          <IconClose width={15} height={15} className="text-error" />
          <span className="w-[70px] text-on-surface-variant">Attempt {r.attempt}</span>
          <span className="min-w-0 flex-1 truncate">{r.error}</span>
          <span className="tabular-nums text-on-surface-variant">{time(r.at)}</span>
        </p>
      ))}
      {call.status === 'running' && (
        <p className="flex items-center gap-2">
          <Spinner size={13} />
          <span className="w-[70px] text-on-surface-variant">Attempt {last.attempt + 1}</span>
          <span className="flex-1">
            {nextAt > now ? `in ${Math.ceil((nextAt - now) / 1000)} s, ` : ''}with a {Math.round(last.timeout_ms / 1000)} s limit
          </span>
        </p>
      )}
    </div>
  )
}

type StepState = 'done' | 'active' | 'quiet' | 'warn'

/** One step on the rail: its state told by ink; only the live one moves. It enters once when it arrives. */
function StepView({ step, run, last, now, turnId }: { step: Step; run: RunState; last: boolean; now: number; turnId: string }) {
  const arrived = useArrival(`${turnId}:${step.id}`)
  const calls = step.tools.map((id) => run.tools[id]).filter(Boolean)
  const live = isLive(run)
  const failed = calls.some((c) => c.status === 'failed')
  const state: StepState = step.done ? (failed ? 'warn' : 'done') : live ? 'active' : run.outcome?.status === 'BUDGET' ? 'warn' : 'quiet'
  const ink = { done: 'text-on-surface-variant', active: 'text-on-surface', quiet: 'text-outline', warn: 'text-error' }[state]
  return (
    <div className={`relative flex gap-2.5 ${arrived ? 'animate-rise' : ''}`}>
      {!last && <span className="absolute bottom-[-12px] left-[7.5px] top-[22px] w-px bg-outline-variant/60" />}
      <span className={`relative flex w-4 shrink-0 justify-center pt-0.5 ${ink}`}>
        {state === 'done' ? (
          <IconCheck width={16} height={16} />
        ) : state === 'active' ? (
          <span className="mt-1 h-2.5 w-2.5 animate-pulse-soft rounded-full bg-primary" />
        ) : state === 'warn' ? (
          <IconError width={16} height={16} />
        ) : (
          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-outline-variant" />
        )}
      </span>
      <div className={`min-w-0 flex-1 ${ink}`}>
        <div className="flex items-baseline gap-2">
          <p className={`flex-1 text-label-medium ${state === 'done' ? 'text-on-surface' : ''}`}>
            {state === 'active' ? <span className="shimmer-text">{step.title}</span> : step.title}
          </p>
          <span className="tabular-nums text-label-small font-normal text-on-surface-variant">
            {step.durationMs !== undefined ? duration(step.durationMs) : state === 'active' ? clock(now - new Date(step.startedAt).getTime()) : ''}
          </span>
        </div>
        {step.summary && <p className="mt-0.5 text-body-small text-on-surface-variant">{step.summary}</p>}
        {calls.length > 0 && <StepTools calls={calls} />}
        {calls.map((c) => (
          <Attempts key={c.id} call={c} now={now} />
        ))}
        {step.notes.map((note, i) => (
          <NoteView key={i} note={note} />
        ))}
      </div>
    </div>
  )
}

/**
 * The run as a quiet trigger line (icon · label · time and counts ·
 * chevron) over its steps on a thin rail. Open while it works; when it ends
 * it folds to "Worked for 42 s · …" and opens again on a press. A turn
 * without steps shows its calls flat.
 */
export function RunCard({ run, turnId }: { run: RunState; turnId: string }) {
  const live = isLive(run)
  const now = useNow(live || !!run.rateUntil)
  // Open while it works, folded once it ends; the member's own choice holds until the run changes between the two.
  const [choice, setChoice] = useState<{ open: boolean; live: boolean }>()
  const open = choice && choice.live === live ? choice.open : live
  const setOpen = (f: (o: boolean) => boolean) => setChoice({ open: f(open), live })
  const c = counts(run)
  const ms = elapsed(run, now)
  const current = [...run.steps].reverse().find((s) => !s.done)
  const flat = flatTools(run)
  const waiting = run.rateUntil && new Date(run.rateUntil).getTime() > now
  const paused = run.phase === 'paused'
  const budget = run.outcome?.status === 'BUDGET'
  if (run.steps.length === 0 && flat.length === 0 && run.thinking.length === 0 && run.notes.length === 0) return null

  const label = live
    ? run.phase === 'pausing'
      ? 'Pausing after this step'
      : waiting
        ? 'Waiting for the rate limit'
        : (current?.title ?? 'Working')
    : paused
      ? `Paused after ${duration(ms)}`
      : budget
        ? `Stopped after ${duration(ms)}`
        : run.phase === 'awaiting_input'
          ? 'Waiting for your answer'
          : `Worked for ${duration(ms)}`
  const meta = [
    live ? (waiting ? clock(new Date(run.rateUntil!).getTime() - now) : clock(ms)) : '',
    c.steps ? (c.steps === 1 ? '1 step' : `${c.steps} steps`) : '',
    c.tools === 1 ? '1 tool call' : `${c.tools} tool calls`,
    c.sources === 1 ? '1 source' : `${c.sources} sources`,
  ]
    .filter(Boolean)
    .join(' · ')
  const icon = live ? (
    <IconSpark width={16} height={16} className={`text-primary ${reducedMotion() ? '' : 'animate-pulse-soft'}`} />
  ) : paused || budget ? (
    <IconPause width={16} height={16} className={budget ? 'text-error' : ''} />
  ) : (
    <IconCheck width={16} height={16} className="text-primary" />
  )

  return (
    <section>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="group flex max-w-full items-center gap-2 text-label-medium text-on-surface-variant hover:text-on-surface">
        {icon}
        <span className={`truncate ${live ? 'text-on-surface' : ''}`}>{live ? <span className="shimmer-text">{label}</span> : label}</span>
        <span className="truncate font-normal tabular-nums text-on-surface-variant">· {meta}</span>
        <IconExpand width={16} height={16} className={`shrink-0 transition-transform duration-[180ms] ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className="disclosure" data-open={open ? '' : undefined}>
        <div>
          <div className="space-y-3 pb-1 pl-px pt-3">
            {run.thinking.map((t, i) => (
              <div key={i} className="flex gap-2.5 text-body-small">
                <IconReason width={16} height={16} className="mt-0.5 shrink-0 text-on-surface-variant" />
                <p className="min-w-0 flex-1">
                  <span className="font-medium">Thought for {duration(t.durationMs)}</span>
                  <span className="text-on-surface-variant"> · {t.summary}</span>
                </p>
              </div>
            ))}
            {run.steps.map((s, i) => (
              <StepView key={s.id} step={s} run={run} last={i === run.steps.length - 1} now={now} turnId={turnId} />
            ))}
            {run.steps.length === 0 && flat.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {flat.map((t) => (
                  <ToolChip key={t.id} call={t} />
                ))}
              </div>
            )}
            {run.notes.map((n, i) => (
              <NoteView key={i} note={n} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/** Where the run summarised older turns: a divider that opens to the summary. */
export function CompactionDivider({ summary, before, after }: { summary: string; before: number; after: number }) {
  const [open, setOpen] = useState(false)
  const k = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}K` : String(n))
  return (
    <div>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-2 text-label-small font-normal text-on-surface-variant">
        <span className="h-px flex-1 bg-outline-variant/60" />
        <IconCompress width={14} height={14} />
        Older turns summarised · {k(before)} → {k(after)} tokens
        <IconExpand width={14} height={14} className={`transition-transform duration-[180ms] ${open ? 'rotate-180' : ''}`} />
        <span className="h-px flex-1 bg-outline-variant/60" />
      </button>
      <div className="disclosure" data-open={open ? '' : undefined}>
        <div>
          <p className="mx-auto mt-2 max-w-[600px] rounded-2xl bg-surface-container-low px-4 py-3 text-body-small text-on-surface-variant">{summary}</p>
        </div>
      </div>
    </div>
  )
}

/** "Summarising older turns" while the run compacts its context. */
export function Compacting() {
  return (
    <p className="flex items-center gap-2 text-label-small font-normal text-on-surface-variant">
      <IconCompress width={14} height={14} />
      <span className="shimmer-text">Summarising older turns</span>
    </p>
  )
}

const words = ['Thinking', 'Working', 'Writing']

/**
 * Before the run's first event: it holds its space at once and shows after
 * 300 ms, so a fast answer never flashes it. One plain word that changes
 * slowly, and a clock after three seconds. The first step replaces it.
 */
export function Waiting() {
  const [start] = useState(() => Date.now())
  const now = useNow(true)
  const secs = Math.floor((now - start) / 1000)
  const word = reducedMotion() ? words[0] : words[Math.floor(secs / 4.5) % words.length]
  return (
    <div role="status" aria-label="The agent is working" className="flex h-7 animate-wait items-center gap-2 text-label-medium text-on-surface-variant">
      <span key={word} className="animate-fade">
        <span className="shimmer-text">{word}…</span>
      </span>
      {secs >= 3 && <span className="font-normal tabular-nums">{clock(now - start)}</span>}
    </div>
  )
}
