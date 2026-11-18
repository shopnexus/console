import { type CSSProperties, type ReactNode, useState } from 'react'
import IconWarnFill from '~icons/material-symbols/error-rounded'
import IconDoneFill from '~icons/material-symbols/check-circle-rounded'
import IconBlock from '~icons/material-symbols-light/do-not-disturb-on-outline-rounded'
import IconBadge from '~icons/material-symbols-light/badge-outline'
import IconCalc from '~icons/material-symbols-light/calculate-outline-rounded'
import IconChevron from '~icons/material-symbols-light/expand-more-rounded'
import IconCompress from '~icons/material-symbols-light/compress-rounded'
import IconDoc from '~icons/material-symbols-light/description-outline-rounded'
import IconError from '~icons/material-symbols-light/error-outline-rounded'
import IconList from '~icons/material-symbols-light/format-list-bulleted-rounded'
import IconLoop from '~icons/material-symbols-light/all-inclusive-rounded'
import IconMore from '~icons/material-symbols-light/more-horiz'
import IconQuestion from '~icons/material-symbols-light/help-outline-rounded'
import IconReason from '~icons/material-symbols-light/psychology-outline-rounded'
import IconRight from '~icons/material-symbols-light/chevron-right-rounded'
import IconSearch from '~icons/material-symbols-light/search-rounded'
import IconShield from '~icons/material-symbols-light/verified-user-outline-rounded'
import IconSpeed from '~icons/material-symbols-light/speed-outline-rounded'
import IconSwap from '~icons/material-symbols-light/swap-horiz-rounded'
import IconTool from '~icons/material-symbols-light/build-outline-rounded'
import { useNow } from '../../lib/dom'
import { clock, duration } from '../../lib/format'
import { reducedMotion, useArrival } from '../../lib/motion'
import { usePanel } from '../../lib/panel'
import { elapsed, flatTools, isLive, type Note, type RunState, type Step, type ToolCall } from '../../lib/run'
import { groupCalls, metaOf, rowTitle } from '../../lib/trace'

/*
 * The run's activity, drawn the way AI Portal draws it (step-run,
 * work-phase-list, agent-trace-row, thinking-indicator). Its styles are the
 * activity section of styles/global.css.
 */

/** Steps shown while a run is live; older ones fold into one row. */
const LIVE_STEPS = 4
/** Rows a live phase shows. */
const LIVE_ROWS = 4
/** Tallies under a phase title before the rest are left to its rows. */
const TALLIES = 3

/** Live text with a light band sweeping across it; the band widens with the text, so short and long sweep at one pace. */
export function Shimmer({ children, length }: { children: ReactNode; length?: number }) {
  const chars = length ?? (typeof children === 'string' ? children.length : 24)
  return (
    <span className="act-shimmer" style={{ '--act-spread': `${Math.max(chars * 2, 20)}px` } as CSSProperties}>
      {children}
    </span>
  )
}

/** A call's icon by what its tool does: counts, searches, lists, reads, or anything else. */
function toolIcon(tool: string, className: string) {
  const p = { width: 16, height: 16, className }
  if (/count|stat|sum|total/.test(tool)) return <IconCalc {...p} />
  if (/search|find|lookup/.test(tool)) return <IconSearch {...p} />
  if (/list/.test(tool)) return <IconList {...p} />
  if (/get|read|detail|show/.test(tool)) return <IconDoc {...p} />
  return <IconTool {...p} />
}

/** One tool call as a row: its icon, "label what", the meta at the right when compact. A press opens it in the tool panel. */
function TraceRow({ calls, index, compact = false }: { calls: ToolCall[]; index: number; compact?: boolean }) {
  const { open, panel } = usePanel()
  const lead = calls[0]
  const on = panel?.kind === 'tool' && calls.some((c) => c.id === panel.id)
  const running = lead.status === 'running'
  const failed = lead.status === 'failed'
  const unsettled = lead.status === 'skipped'
  const state = running ? 'active' : failed ? 'warn' : 'done'
  const title = rowTitle(lead)
  const meta = metaOf(calls)
  return (
    <div className={`act-step ${index > 0 ? 'act-enter' : ''}`} data-state={state} data-compact={compact ? '' : undefined}>
      <span className="act-rail" aria-hidden>
        {failed ? <IconError width={16} height={16} /> : toolIcon(lead.tool, `${running ? 'act-pulse' : ''} ${unsettled ? 'opacity-60' : ''}`)}
      </span>
      <div className="min-w-0 flex-1">
        <button
          type="button"
          aria-label={[title.verb, title.text].filter(Boolean).join(' ')}
          aria-pressed={on}
          data-panel-trigger=""
          onClick={() => open(on ? undefined : { kind: 'tool', id: lead.id })}
          className="act-title group/row flex w-full min-w-0 items-center gap-1 rounded-md text-left"
        >
          <span className={`min-w-0 truncate ${unsettled ? 'opacity-70' : ''}`}>
            {running ? (
              <Shimmer length={title.text.length}>{title.text}</Shimmer>
            ) : (
              <>
                {title.verb && <span className="text-outline">{title.verb} </span>}
                {title.text}
              </>
            )}
          </span>
          {compact && meta.length > 0 && <span className="ml-auto shrink-0 pl-3 text-[12.5px] leading-4 tabular-nums text-outline">{meta.join(' · ')}</span>}
          <IconRight width={16} height={16} className={`ui-chevron shrink-0 text-outline ${on ? 'opacity-100' : 'opacity-0 group-hover/row:opacity-100'}`} aria-hidden />
        </button>
        {!compact && meta.length > 0 && (
          <div className="act-meta">
            <span className="tabular-nums">{meta.join(' · ')}</span>
          </div>
        )}
      </div>
    </div>
  )
}

/** What the model turned over between steps: the quietest row, a dot, opening to its summary on a press only. */
function ThinkingRow({ t, index }: { t: { summary: string; durationMs: number }; index: number }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`act-step ${index > 0 ? 'act-enter' : ''}`} data-state="quiet">
      <span className="act-rail" aria-hidden>
        <span className="act-dot" />
      </span>
      <div className="min-w-0 flex-1">
        <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="act-think group/row flex w-full min-w-0 items-center gap-1 rounded-md text-left">
          <span className="min-w-0 truncate">Thought for {duration(t.durationMs)}</span>
          <IconChevron width={16} height={16} className={`ui-chevron shrink-0 text-outline ${open ? 'rotate-180 opacity-100' : 'opacity-0 group-hover/row:opacity-100'}`} aria-hidden />
        </button>
        <div className="act-disclosure" data-open={open ? '' : undefined} inert={!open}>
          <div className="pt-1">
            <p className="act-think-body mb-1">{t.summary}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

const guardText: Record<string, [string, typeof IconBadge]> = {
  pii_masked: ['Personal data masked', IconBadge],
  off_topic: ['Refused off-topic', IconBlock],
  loop_stopped: ['Stopped a loop', IconLoop],
  rate_limited: ['Rate limited', IconSpeed],
}

/** A provider switch or a guardrail, as a quiet row in the run. */
function NoteRow({ note }: { note: Note }) {
  const [title, Icon] =
    note.kind === 'switch'
      ? [`${note.from} returned ${note.reason}; switched to ${note.to}, same model`, IconSwap]
      : // Rules the console has no words for yet show by their name.
        (guardText[note.rule] ?? [note.rule.replace(/_/g, ' '), IconShield])
  return (
    <div className="act-step" data-state="quiet" data-compact="">
      <span className="act-rail" aria-hidden>
        <Icon width={16} height={16} />
      </span>
      <p className="act-think min-w-0 flex-1">
        {title}
        {note.kind === 'guardrail' && note.detail && <span> · {note.detail}</span>}
      </p>
    </div>
  )
}

type PhaseState = 'active' | 'warn' | 'done'

function Rail({ state }: { state: PhaseState }) {
  if (state === 'active') return <span role="img" aria-label="In progress" className="mt-0.5 size-3.5 animate-spin rounded-full border-[1.8px] border-hairline border-t-on-surface" />
  if (state === 'warn') return <IconWarnFill role="img" aria-label="A step failed" width={16} height={16} className="text-tertiary" />
  return <IconDoneFill role="img" aria-label="Done" width={16} height={16} className="text-primary" />
}

/** "Support tickets ×3", most frequent first. */
function talliesOf(calls: ToolCall[]): string[] {
  const counts = new Map<string, number>()
  for (const c of calls) {
    const label = rowTitle({ ...c, input: undefined }).text
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TALLIES)
    .map(([label, n]) => (n > 1 ? `${label} ×${n}` : label))
}

/** How long a phase took, or its clock while it is the one in progress. */
function PhaseTime({ step, active, now }: { step: Step; active: boolean; now: number }) {
  const ms = active ? Math.max(0, now - new Date(step.startedAt).getTime()) : step.durationMs
  if (ms === undefined || (!active && ms < 1000)) return null
  return <span className="mt-0.5 shrink-0 text-[12.5px] tabular-nums text-outline">{active ? clock(ms) : duration(ms)}</span>
}

/** One of our steps as a phase: its title, its calls folded to tallies until it is opened, and what it found. */
function PhaseRow({ step, run, live, now }: { step: Step; run: RunState; live: boolean; now: number }) {
  const calls = step.tools.map((id) => run.tools[id]).filter(Boolean)
  const failed = calls.filter((c) => c.status === 'failed').length
  const state: PhaseState = (live && !step.done) || calls.some((c) => c.status === 'running') ? 'active' : failed ? 'warn' : 'done'
  const [open, setOpen] = useState(false)
  const inner = calls.length > 0 || !!step.summary || step.notes.length > 0
  const expanded = open || (state === 'active' && calls.length > 0)
  const groups = groupCalls(calls)
  const shown = state === 'active' && !open ? groups.slice(-LIVE_ROWS) : groups
  return (
    <div className="ph" data-state={state}>
      <span className="act-rail">
        <Rail state={state} />
      </span>
      <div className="min-w-0 flex-1">
        <button type="button" aria-expanded={expanded} disabled={!inner} onClick={() => setOpen((o) => !o)} className="flex w-full items-start gap-2 rounded-md text-left">
          <span className={`ph-title min-w-0 flex-1 ${expanded ? '' : 'line-clamp-2'}`}>{state === 'active' ? <Shimmer>{step.title}</Shimmer> : step.title}</span>
          <PhaseTime step={step} active={state === 'active'} now={now} />
          {inner && state !== 'active' && <IconChevron width={16} height={16} className={`ui-chevron mt-0.5 shrink-0 text-outline ${expanded ? 'rotate-180' : ''}`} aria-hidden />}
        </button>
        {calls.length > 0 && !expanded && (
          <div className="ph-meta">
            {failed > 0 && <span className="ph-tally ph-tally-warn">{failed} failed</span>}
            {talliesOf(calls).map((t) => (
              <span key={t} className="ph-tally">
                {t}
              </span>
            ))}
          </div>
        )}
        {expanded && (
          <div className="ph-inner">
            <div className="ph-rows">
              {shown.map((g, i) => (
                <TraceRow key={g[0].id} calls={g} index={i} compact />
              ))}
              {step.notes.map((n, i) => (
                <NoteRow key={i} note={n} />
              ))}
            </div>
            {step.summary && <p className="ph-said">{step.summary}</p>}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * The run as one trigger line (brain · "Working" and its clock, or "Worked
 * for 42 s" · steps · chevron) over its work: our steps as phases, or the
 * calls as rows when the run has no steps. Open while there is something to
 * watch, folded once there is not, unless the member opened or closed it.
 */
export function RunCard({ run }: { run: RunState; turnId: string }) {
  const live = isLive(run)
  const asking = run.phase === 'awaiting_input'
  const now = useNow(live || !!run.rateUntil)
  const [touched, setTouched] = useState<boolean>()
  const [showEarlier, setShowEarlier] = useState(false)
  const expanded = touched ?? (live || asking)
  const flat = flatTools(run)
  const phased = run.steps.length > 0
  if (!phased && flat.length === 0 && run.thinking.length === 0 && run.notes.length === 0) return null

  const ms = elapsed(run, now) ?? 0
  const calls = run.toolOrder.map((id) => run.tools[id]).filter(Boolean)
  const failed = calls.filter((c) => c.status === 'failed').length
  const waiting = run.rateUntil && new Date(run.rateUntil).getTime() > now
  const budget = run.outcome?.status === 'BUDGET'
  const liveLabel = run.phase === 'pausing' ? 'Pausing after this step' : waiting ? 'Waiting for the rate limit' : 'Working'
  const settled = asking
    ? 'Waiting for your answer'
    : run.phase === 'paused'
      ? `Paused${ms ? ` after ${duration(ms)}` : ''}`
      : budget
        ? `Stopped${ms ? ` after ${duration(ms)}` : ''}`
        : ms
          ? `Worked for ${duration(ms)}`
          : 'Worked'
  const rows: ReactNode[] = [
    ...run.thinking.map((t, i) => <ThinkingRow key={`t${i}`} t={t} index={i} />),
    ...groupCalls(flat).map((g, i) => <TraceRow key={g[0].id} calls={g} index={run.thinking.length + i} />),
  ]
  const hidden = live && !showEarlier ? Math.max(0, rows.length - LIVE_STEPS) : 0
  const lastTitle = run.steps[run.steps.length - 1]?.title

  return (
    <div className="flex w-full flex-col">
      <button type="button" aria-expanded={expanded} onClick={() => setTouched(!expanded)} className="act-trigger w-fit rounded-md">
        <span role="status" className="contents">
          {asking ? <IconQuestion width={16} height={16} className="shrink-0 text-tertiary" aria-hidden /> : <IconReason width={16} height={16} className="shrink-0" aria-hidden />}
          {live ? (
            <>
              <Shimmer>{liveLabel}</Shimmer>
              <span className="tabular-nums text-outline">{waiting ? clock(new Date(run.rateUntil!).getTime() - now) : clock(ms)}</span>
            </>
          ) : (
            <span className={`truncate ${asking ? 'text-on-surface' : ''}`}>{settled}</span>
          )}
        </span>
        {calls.length > 0 && (
          <span className="shrink-0 tabular-nums text-outline">
            · {calls.length} {calls.length === 1 ? 'step' : 'steps'}
            {failed ? ` · ${failed} failed` : ''}
            {run.steps.length > 1 ? ` · ${run.steps.length} phases` : ''}
          </span>
        )}
        <IconChevron width={16} height={16} className={`ui-chevron shrink-0 text-outline ${expanded ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {phased && !expanded && lastTitle && <p className="ml-6 mt-0.5 truncate text-[14px] leading-5 text-outline">{lastTitle}</p>}
      <div className="act-disclosure" data-open={expanded ? '' : undefined} inert={!expanded}>
        <div>
          {phased && rows.length > 0 && <div className="act-list">{rows}</div>}
          {phased ? (
            <div className="ph-list">
              {run.steps.map((s, i) => (
                <PhaseRow key={s.id} step={s} run={run} live={live && i === run.steps.length - 1} now={now} />
              ))}
            </div>
          ) : (
            <div className="act-list">
              {hidden > 0 && (
                <button type="button" onClick={() => setShowEarlier(true)} className="act-step w-full rounded-md text-left hover:text-on-surface" data-state="quiet">
                  <span className="act-rail" aria-hidden>
                    <IconMore width={16} height={16} />
                  </span>
                  <span className="act-think">
                    {hidden} earlier {hidden === 1 ? 'step' : 'steps'}
                  </span>
                </button>
              )}
              {rows.slice(hidden)}
            </div>
          )}
          {run.notes.length > 0 && (
            <div className="act-list">
              {run.notes.map((n, i) => (
                <NoteRow key={i} note={n} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
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
        <IconChevron width={14} height={14} className={`ui-chevron ${open ? 'rotate-180' : ''}`} />
        <span className="h-px flex-1 bg-outline-variant/60" />
      </button>
      <div className="act-disclosure" data-open={open ? '' : undefined}>
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
    <p className="flex items-center gap-2 text-[14px] leading-5 text-on-surface-variant">
      <IconCompress width={16} height={16} />
      <Shimmer>Summarising older turns</Shimmer>
    </p>
  )
}

const verbs = ['Thinking', 'Working', 'Writing']
/** Seconds before the clock appears, and before the wait is explained. */
const CLOCK_AFTER = 3
const LONG_WAIT = 20

/**
 * Before the run's first event: a brain and one plain word that changes
 * slowly, a clock after three seconds and a note after twenty. It fades in
 * when a wait begins; the first step replaces it.
 */
export function Waiting() {
  const arrived = useArrival()
  const [start] = useState(() => Date.now())
  const now = useNow(true)
  const secs = Math.floor((now - start) / 1000)
  const i = reducedMotion() ? 0 : Math.floor(secs / 4.5)
  return (
    <div role="status" aria-label="The agent is thinking" className={`flex flex-col gap-0.5 py-1 text-[14px] leading-5 text-on-surface-variant ${arrived ? 'ui-fade-in' : ''}`}>
      <div className="flex items-center gap-2">
        <IconReason width={16} height={16} className="shrink-0" aria-hidden />
        <span key={i} aria-hidden className={i > 0 ? 'ui-fade-in' : ''}>
          <Shimmer>{`${verbs[i % verbs.length]}…`}</Shimmer>
        </span>
        {secs >= CLOCK_AFTER && (
          <span aria-hidden className="tabular-nums text-outline">
            {secs < 60 ? `${secs} s` : duration(secs * 1000)}
          </span>
        )}
      </div>
      {secs >= LONG_WAIT && <p className="pl-6 text-[12.5px] text-outline">Still working, long answers can take a minute.</p>}
    </div>
  )
}
