import { type ReactNode, useState } from 'react'
import IconSpark from '~icons/material-symbols/auto-awesome-outline-rounded'
import IconBlock from '~icons/material-symbols-light/do-not-disturb-on-outline-rounded'
import IconBadge from '~icons/material-symbols-light/badge-outline'
import IconBuild from '~icons/material-symbols-light/build-outline-rounded'
import IconCheck from '~icons/material-symbols-light/check-rounded'
import IconClose from '~icons/material-symbols-light/close-rounded'
import IconCompress from '~icons/material-symbols-light/compress-rounded'
import IconDoc from '~icons/material-symbols-light/description-outline-rounded'
import IconEdit from '~icons/material-symbols-light/edit-note-outline-rounded'
import IconError from '~icons/material-symbols-light/error-outline-rounded'
import IconExpand from '~icons/material-symbols-light/expand-more-rounded'
import IconLess from '~icons/material-symbols-light/expand-less-rounded'
import IconHourglass from '~icons/material-symbols-light/hourglass-top-rounded'
import IconLoop from '~icons/material-symbols-light/all-inclusive-rounded'
import IconPause from '~icons/material-symbols-light/pause-rounded'
import IconReason from '~icons/material-symbols-light/psychology-outline-rounded'
import IconSchedule from '~icons/material-symbols-light/schedule-outline-rounded'
import IconSpeed from '~icons/material-symbols-light/speed-outline-rounded'
import IconSwap from '~icons/material-symbols-light/swap-horiz-rounded'
import IconTimer from '~icons/material-symbols-light/timer-outline'
import IconToken from '~icons/material-symbols-light/token-outline'
import { clock, compact, duration, time } from '../../lib/format'
import { useNow } from '../../lib/dom'
import { usePanel } from '../../lib/panel'
import { counts, elapsed, flatTools, type GuardrailRule, isLive, type Note, type RunState, type Step, type ToolCall } from '../../lib/run'
import { Spinner } from '../ui'

/** A tool call as a chip: its state, the tool, what it was called on and what came back. A press opens the tool panel. */
export function ToolChip({ call, count }: { call: ToolCall; count?: string }) {
  const { open, panel } = usePanel()
  const on = panel?.kind === 'tool' && panel.id === call.id
  const failed = call.status === 'failed'
  const icon =
    call.status === 'running' ? (
      call.retries.length ? <IconHourglass width={13} height={13} className="text-tertiary" /> : <Spinner />
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
      onClick={() => open(on ? undefined : { kind: 'tool', id: call.id })}
      className={`inline-flex h-7 max-w-full items-center gap-1.5 rounded-[9px] border px-2 text-label-small font-normal ${
        failed ? 'border-error/30 bg-error/4 text-error' : on ? 'border-primary/40 bg-primary/4 ring-2 ring-primary/30' : 'border-hairline bg-surface-container-lowest hover:bg-surface-container-low'
      }`}
    >
      {icon}
      <span className="font-medium">{call.tool}</span>
      {call.label && !count && <span className={`truncate ${failed ? '' : 'text-on-surface-variant'}`}>{call.label}</span>}
      {count && <span className="rounded-[5px] bg-surface-container px-1 text-[11px] font-semibold">{count}</span>}
      {call.resultSummary && !count && <span className={failed ? 'opacity-80' : 'text-on-surface-variant'}>→ {call.resultSummary}</span>}
    </button>
  )
}

/** A step's calls: up to three of one tool each as a chip, more as "tool ×n" that opens to them. */
function StepTools({ calls }: { calls: ToolCall[] }) {
  const [openTools, setOpenTools] = useState<string[]>([])
  const byTool = new Map<string, ToolCall[]>()
  for (const c of calls) byTool.set(c.tool, [...(byTool.get(c.tool) ?? []), c])
  const out: ReactNode[] = []
  for (const [tool, list] of byTool) {
    if (list.length > 3 && !openTools.includes(tool)) {
      const running = list.filter((c) => c.status === 'running').length
      const done = list.length - running
      const lead = list.find((c) => c.status === 'running') ?? list[0]
      out.push(
        <span key={tool} onClickCapture={(e) => (e.preventDefault(), e.stopPropagation(), setOpenTools((t) => [...t, tool]))}>
          <ToolChip call={{ ...lead, label: '' }} count={running ? `${done}/${list.length}` : `×${list.length}`} />
        </span>,
      )
    } else for (const c of list) out.push(<ToolChip key={c.id} call={c} />)
  }
  return <div className="mt-2 flex flex-wrap gap-1.5">{out}</div>
}

const guardText: Record<GuardrailRule, [string, (s: number) => ReactNode]> = {
  pii_masked: ['Personal data masked', (s) => <IconBadge width={s} height={s} />],
  off_topic: ['Refused off-topic', (s) => <IconBlock width={s} height={s} />],
  loop_stopped: ['Stopped a loop', (s) => <IconLoop width={s} height={s} />],
  rate_limited: ['Rate limited', (s) => <IconSpeed width={s} height={s} />],
}

/** A provider switch or a guardrail inside the run. */
export function NoteView({ note }: { note: Note }) {
  if (note.kind === 'switch') {
    return (
      <div className="mt-2.5 flex items-start gap-2.5 rounded-xl bg-tertiary-fixed/50 px-3 py-2.5 text-on-tertiary-fixed-variant">
        <IconSwap width={17} height={17} className="mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-label-medium">
            {note.from} returned {note.reason}
          </p>
          <p className="mt-0.5 text-body-small opacity-80">Switched to {note.to}; same model</p>
        </div>
      </div>
    )
  }
  const [title, icon] = guardText[note.rule] ?? ['Guardrail', guardText.off_topic[1]]
  return (
    <div className="mt-2.5 flex items-start gap-2.5 rounded-xl bg-primary/6 px-3 py-2.5 text-primary">
      <span className="mt-0.5 shrink-0">{icon(17)}</span>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="text-label-medium">{title}</p>
        <p className="mt-0.5 text-body-small opacity-80">{note.detail}</p>
      </div>
    </div>
  )
}

/** A call's failed attempts and the next one, while the run retries it. */
function Attempts({ call, now }: { call: ToolCall; now: number }) {
  if (call.retries.length === 0) return null
  const last = call.retries[call.retries.length - 1]
  const nextAt = new Date(last.at).getTime() + last.next_in_ms
  return (
    <div className="mt-2.5 space-y-1.5 rounded-xl bg-surface-container-low px-3 py-2.5 text-body-small">
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
          <Spinner size={14} />
          <span className="w-[70px] text-on-surface-variant">Attempt {last.attempt + 1}</span>
          <span className="flex-1">
            {nextAt > now ? `in ${Math.ceil((nextAt - now) / 1000)} s, ` : ''}with a {Math.round(last.timeout_ms / 1000)} s limit
          </span>
          <span className="text-on-surface-variant">{call.tool}</span>
        </p>
      )}
    </div>
  )
}

function StepView({ step, n, run, last, now }: { step: Step; n: number; run: RunState; last: boolean; now: number }) {
  const calls = step.tools.map((id) => run.tools[id]).filter(Boolean)
  const live = isLive(run)
  const state = step.done ? 'done' : live ? 'run' : 'wait'
  return (
    <div className="relative flex gap-3 pb-4">
      {!last && <span className="absolute bottom-0 left-[13px] top-8 w-px bg-outline-variant/60" />}
      <span className="relative z-10">
        {state === 'done' ? (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
            <IconCheck width={16} height={16} />
          </span>
        ) : state === 'run' ? (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
            <Spinner size={14} />
          </span>
        ) : (
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-dashed text-[11px] font-semibold ${
              run.outcome?.status === 'BUDGET' ? 'border-error/50 text-error' : 'border-outline-variant text-outline'
            }`}
          >
            {n}
          </span>
        )}
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex items-center gap-2">
          <p className={`flex-1 text-title-small ${state === 'wait' ? 'text-on-surface-variant' : ''}`}>{step.title}</p>
          <span className="tabular-nums text-label-small font-normal text-on-surface-variant">
            {step.durationMs !== undefined ? duration(step.durationMs) : state === 'run' ? clock(now - new Date(step.startedAt).getTime()) : ''}
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

function Stat({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-surface-container-lowest px-2.5 text-label-small font-normal tabular-nums shadow-soft [&>svg]:text-primary">
      {icon}
      {children}
    </span>
  )
}

/**
 * The run: while it works, a card with the elapsed time and live counts and
 * a timeline of steps; when it ends, one line "Worked for 42 s" that opens
 * to the reasoning summary and the steps. A turn without steps shows its
 * calls flat.
 */
export function RunCard({ run }: { run: RunState }) {
  const live = isLive(run)
  const now = useNow(live || !!run.rateUntil)
  const [unfolded, setUnfolded] = useState(false)
  const c = counts(run)
  const ms = elapsed(run, now)
  const current = [...run.steps].reverse().find((s) => !s.done)
  const flat = flatTools(run)
  const steps =
    run.steps.length > 0 ? (
      <div className="px-4 pt-4">
        {run.steps.map((s, i) => (
          <StepView key={s.id} step={s} n={i + 1} run={run} last={i === run.steps.length - 1} now={now} />
        ))}
      </div>
    ) : flat.length > 0 ? (
      <div className="flex flex-wrap gap-1.5 px-4 py-3">
        {flat.map((t) => (
          <ToolChip key={t.id} call={t} />
        ))}
      </div>
    ) : null
  const runNotes = run.notes.length > 0 && (
    <div className="px-4 pb-3">
      {run.notes.map((n, i) => (
        <NoteView key={i} note={n} />
      ))}
    </div>
  )

  if (live || run.phase === 'awaiting_input') {
    if (run.steps.length === 0 && flat.length === 0 && run.phase === 'awaiting_input') return null
    const waiting = run.rateUntil && new Date(run.rateUntil).getTime() > now
    return (
      <section className="overflow-hidden rounded-4xl border border-hairline bg-surface-container-lowest shadow-soft">
        <div className="flex items-center gap-2.5 border-b border-hairline px-4 py-3">
          <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary">
            <IconSpark width={17} height={17} />
            {live && <span className="absolute -inset-1 animate-ping rounded-full border-2 border-primary/30" />}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-title-small">
              {run.phase === 'pausing' ? 'Pausing after this step' : waiting ? 'Waiting for the rate limit' : (current?.title ?? 'Working')}
            </p>
            <p className="truncate text-body-small text-on-surface-variant">
              {[run.steps.length ? `Step ${run.steps.length}` : '', run.agent?.name, run.model].filter(Boolean).join(' · ')}
            </p>
          </div>
          {waiting && (
            <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-tertiary-fixed/60 px-2.5 text-label-small tabular-nums text-on-tertiary-fixed-variant">
              <IconHourglass width={14} height={14} />
              {clock(new Date(run.rateUntil!).getTime() - now)}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5 border-b border-hairline bg-surface-container-low/50 px-4 py-2">
          <Stat icon={<IconTimer width={14} height={14} />}>{clock(ms)}</Stat>
          <Stat icon={<IconDoc width={14} height={14} />}>{c.sources === 1 ? '1 source' : `${c.sources} sources`}</Stat>
          <Stat icon={<IconBuild width={14} height={14} />}>{c.tools === 1 ? '1 tool call' : `${c.tools} tool calls`}</Stat>
          <Stat icon={<IconToken width={14} height={14} />}>{compact(c.tokens)} tokens</Stat>
        </div>
        {steps}
        {runNotes}
      </section>
    )
  }

  if (!steps && run.thinking.length === 0 && !runNotes) return null
  const paused = run.phase === 'paused'
  const budget = run.outcome?.status === 'BUDGET'
  return (
    <section className="overflow-hidden rounded-3xl border border-hairline bg-surface-container-lowest">
      <button type="button" onClick={() => setUnfolded((u) => !u)} aria-expanded={unfolded} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left">
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full ${budget ? 'bg-error-container text-error' : paused ? 'bg-surface-container-highest text-on-surface-variant' : 'bg-primary/10 text-primary'}`}
        >
          {paused || budget ? <IconPause width={16} height={16} /> : <IconCheck width={16} height={16} />}
        </span>
        <span className="flex-1 text-title-small">
          {paused ? 'Paused' : budget ? 'Stopped' : 'Worked'} {paused || budget ? 'after' : 'for'} {duration(ms)}
        </span>
        <span className="tabular-nums text-body-small text-on-surface-variant">
          {[c.steps ? (c.steps === 1 ? '1 step' : `${c.steps} steps`) : '', c.tools === 1 ? '1 tool call' : `${c.tools} tool calls`, c.sources === 1 ? '1 source' : `${c.sources} sources`]
            .filter(Boolean)
            .join(' · ')}
        </span>
        {unfolded ? <IconLess width={18} height={18} className="text-on-surface-variant" /> : <IconExpand width={18} height={18} className="text-on-surface-variant" />}
      </button>
      {unfolded && (
        <div className="border-t border-hairline">
          {run.thinking.map((t, i) => (
            <div key={i} className="flex items-start gap-2.5 border-b border-hairline bg-surface-container-low/40 px-4 py-2.5">
              <IconReason width={18} height={18} className="mt-0.5 text-on-surface-variant" />
              <p className="min-w-0 flex-1 text-body-small">
                <span className="font-medium">Thought for {duration(t.durationMs)}</span>
                <span className="text-on-surface-variant"> · {t.summary}</span>
              </p>
            </div>
          ))}
          {steps}
          {runNotes}
        </div>
      )}
    </section>
  )
}

/** The answer as it is written, while the run works. */
export function DraftSoFar({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-hairline px-4 py-3">
      <p className="mb-1 flex items-center gap-1.5 text-label-small text-on-surface-variant">
        <IconEdit width={14} height={14} />
        Draft so far
      </p>
      <p className="text-body-medium text-on-surface-variant">
        {text}
        <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-primary" />
      </p>
    </div>
  )
}

/** Where the run summarised older turns: a divider that opens to the summary. */
export function CompactionDivider({ summary, before, after }: { summary: string; before: number; after: number }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-2 text-label-small font-normal text-on-surface-variant">
        <span className="h-px flex-1 bg-outline-variant/60" />
        <IconCompress width={14} height={14} />
        Older turns summarised · {compact(before)} → {compact(after)} tokens
        {open ? <IconLess width={14} height={14} /> : <IconExpand width={14} height={14} />}
        <span className="h-px flex-1 bg-outline-variant/60" />
      </button>
      {open && <p className="mx-auto mt-2 max-w-[600px] rounded-2xl bg-surface-container-low px-4 py-3 text-body-small text-on-surface-variant">{summary}</p>}
    </div>
  )
}

/** "Summarising older turns" while the run compacts its context. */
export function Compacting() {
  return (
    <p className="flex items-center gap-2 text-label-small font-normal text-on-surface-variant">
      <Spinner size={12} />
      Summarising older turns
    </p>
  )
}
