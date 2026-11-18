import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router'
import IconCheck from '~icons/material-symbols-light/check-rounded'
import IconCopy from '~icons/material-symbols-light/content-copy-outline-rounded'
import IconError from '~icons/material-symbols-light/error-outline-rounded'
import IconFlag from '~icons/material-symbols-light/flag-outline-rounded'
import IconPause from '~icons/material-symbols-light/pause-circle-outline-rounded'
import IconPerson from '~icons/material-symbols-light/person-outline-rounded'
import IconPlay from '~icons/material-symbols-light/play-arrow-rounded'
import IconRetry from '~icons/material-symbols-light/refresh-rounded'
import IconTicket from '~icons/material-symbols-light/package-2-outline'
import IconBolt from '~icons/material-symbols-light/bolt-outline-rounded'
import IconDown from '~icons/material-symbols-light/arrow-downward-rounded'
import {
  type Answers,
  answerTurn,
  type Attachment,
  continueTurn,
  controlFailure,
  endTurn,
  failureOf,
  failureText,
  pauseTurn,
  runOf,
  type Skill,
  steerTurn,
  stopTurn,
  type SubjectKind,
  type Turn,
  useConversation,
  useRun,
  useSkillCommands,
  useSkills,
  pendingTurn,
  postTurn,
  putTurn,
  dropTurn,
  startChat,
  isTempChat,
  detailKey,
  type ConversationDetail,
  type TurnRequest,
  skillFailure,
  variablesOf,
} from '../../lib/agent'
import { ApiError, shortId } from '../../lib/api'
import { useDismiss, useNow } from '../../lib/dom'
import { markThreadOpened, useArrival, useSmoothReveal } from '../../lib/motion'
import { clock, compact, duration, time, usd } from '../../lib/format'
import { type Panel, PanelContext, type PanelApi } from '../../lib/panel'
import { answerBlocks, canContinue, counts, elapsed, isLive, outcomeGroup, type RunState } from '../../lib/run'
import { plain } from '../../lib/markdown'
import { useMe } from '../../lib/session'
import { usePickableAgents } from '../../lib/settings'
import { AttachMenu } from '../AttachMenu'
import { Btn, Mascot, Spinner } from '../ui'
import { Blocks, SourceList, SourcesButton } from './Answer'
import { ClarifyCard } from './Clarify'
import { BudgetLock, type Chip, Composer, type ComposerMode, PausedStrip } from './Composer'
import { DocumentPanel, SourcesPanel, ToolOverlay } from './Panels'
import { CompactionDivider, Compacting, RunCard, Waiting } from './Run'

const attachIcon: Record<Attachment['kind'], ReactNode> = {
  ticket: <IconTicket width={13} height={13} />,
  account: <IconPerson width={13} height={13} />,
  report_case: <IconFlag width={13} height={13} />,
  order: <IconTicket width={13} height={13} />,
  listing: <IconFlag width={13} height={13} />,
  document: <IconBolt width={13} height={13} />,
}

const attachTone: Record<Attachment['kind'], string> = {
  ticket: 'bg-secondary-container/60',
  account: 'bg-primary/7',
  report_case: 'bg-error-container/60',
  order: 'bg-tertiary-fixed/60',
  listing: 'bg-inverse-primary/30',
  document: 'bg-primary/7',
}

function Bubble({ turn, by }: { turn: Turn; by?: string }) {
  return (
    <div className="flex flex-col items-end gap-1.5">
      {(turn.attachments?.length || turn.skill_id) && (
        <div className="flex flex-wrap justify-end gap-1.5">
          {turn.attachments?.map((a) => (
            <span key={a.kind + a.id} className={`inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-label-small font-normal ${attachTone[a.kind]}`}>
              {attachIcon[a.kind]}
              {a.label ?? `${a.kind} ${shortId(a.id)}`}
            </span>
          ))}
        </div>
      )}
      {/* The question stays as the member wrote it. */}
      <p className="max-w-[80%] whitespace-pre-wrap rounded-4xl rounded-br-[6px] bg-primary/8 px-4 py-2.5 text-body-large">{turn.text}</p>
      {by && <p className="px-1 text-label-small font-normal tabular-nums text-on-surface-variant">{by}</p>}
    </div>
  )
}

/** Each steer under the question it went to: Waiting, read before a step, or not read with "Send as a new message". */
function Steers({ run, onAsk }: { run: RunState; onAsk?: (text: string) => void }) {
  const shown = run.steers.filter((s) => s.text)
  if (shown.length === 0) return null
  return (
    <div className="space-y-2">
      {shown.map((s) => (
        <div key={s.id} className="flex flex-col items-end gap-1">
          <p className="max-w-[70%] whitespace-pre-wrap rounded-3xl rounded-br-[6px] border border-dashed border-primary/30 bg-primary/4 px-3.5 py-2 text-body-medium">{s.text}</p>
          <p className="flex items-center gap-1.5 px-1 text-label-small font-normal text-on-surface-variant">
            {s.state === 'waiting' && (
              <>
                <Spinner size={10} />
                Waiting
              </>
            )}
            {s.state === 'read' && (
              <>
                <IconCheck width={14} height={14} className="text-primary" />
                Read before step {s.beforeStep}
              </>
            )}
            {s.state === 'unread' && (
              <>
                Not read
                {onAsk && (
                  <button type="button" onClick={() => onAsk(s.text)} className="font-medium text-primary">
                    · Send as a new message
                  </button>
                )}
              </>
            )}
          </p>
        </div>
      ))}
    </div>
  )
}

const outcomeCopy: Record<'stopped' | 'out_of_room' | 'broken' | 'unavailable' | 'blocked', [string, string]> = {
  stopped: ['Stopped', 'What it found so far is kept.'],
  out_of_room: ['Ran out of time', 'It stopped at its time limit and kept what it found. Continue, or ask a shorter question.'],
  broken: ['Broke on the way', 'Something failed partway; what it found is kept.'],
  unavailable: ['The agent is unavailable', 'Pick another agent, or try again later.'],
  blocked: ['A guardrail stopped this run', ''],
}

function OutcomeNotice({ run, last, onContinue, busy }: { run: RunState; last: boolean; onContinue: () => void; busy: boolean }) {
  const g = outcomeGroup(run)
  if (!g || g === 'done') return null
  if (g === 'budget') {
    const c = counts(run)
    return (
      <section className="overflow-hidden rounded-4xl border border-error/25 bg-surface-container-lowest shadow-soft">
        <div className="flex items-start gap-3 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-error-container text-error">
            <IconPause width={22} height={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-title-medium">Stopped: your daily budget is used up</p>
            <p className="mt-0.5 text-body-medium text-on-surface-variant">
              {c.steps ? `${run.steps.filter((s) => s.done).length} of ${c.steps} steps done. ` : ''}What it found so far is kept.
            </p>
            <p className="mt-1.5 text-body-small text-on-surface-variant">Resets at midnight</p>
          </div>
        </div>
      </section>
    )
  }
  const [title, help] = outcomeCopy[g]
  const cont = last && canContinue(run)
  return (
    <div className="flex animate-rise items-center gap-3 rounded-3xl border border-hairline px-4 py-3" role="status">
      <span className={g === 'stopped' ? 'text-on-surface-variant' : 'text-error'}>{g === 'stopped' ? <IconPause width={19} height={19} /> : <IconError width={19} height={19} />}</span>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="text-title-small">{title}</p>
        {(help || run.outcome?.failure) && <p className="mt-0.5 text-body-small text-on-surface-variant">{g === 'blocked' ? run.outcome?.failure : help}</p>}
      </div>
      {cont && (
        <Btn kind="primary" icon={<IconPlay width={17} height={17} />} onClick={onContinue} disabled={busy}>
          Continue
        </Btn>
      )}
    </div>
  )
}

/** One action under a reply: a quiet 32 px icon button (AI Portal's reply action). */
function ReplyButton({ label, pressed = false, onClick, children }: { label: string; pressed?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={`flex size-8 items-center justify-center rounded-lg transition-colors duration-[120ms] ${pressed ? 'bg-on-surface/8 text-on-surface' : 'text-on-surface-variant hover:bg-on-surface/8 hover:text-on-surface'}`}
    >
      {children}
    </button>
  )
}

/**
 * How long a turn took and, when the agent knows them, its tokens and cost,
 * as quiet text after the reply actions (AI Portal's turn meta). It opens
 * the turn's details. Answers show it on hover or focus only; the latest
 * shows it while it runs, without a time, since the activity line already
 * ticks. What is unknown or zero is left out, and with nothing left it is
 * not drawn.
 */
function TurnMeta({ run, always }: { run: RunState; always: boolean }) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const ref = useDismiss<HTMLDivElement>(open, close)
  const live = isLive(run)
  const now = useNow(live)
  const ms = elapsed(run, now)
  // Uncached input and output: what the prompt cache held is in the details only.
  const tokens = run.usage.input + run.usage.output
  const cost = run.usage.costUsd
  const firstMs = run.firstTokenMs ?? (run.firstTokenAt && run.startedAt ? new Date(run.firstTokenAt).getTime() - new Date(run.startedAt).getTime() : undefined)
  const time = ms === undefined ? undefined : live ? clock(ms) : duration(ms)
  // While it runs, the clock is the activity line's; this adds only what it spends.
  const line = [!live && time, tokens > 0 && `${compact(tokens)} tokens`, cost > 0 && `≈ ${usd(cost)}`].filter(Boolean).join(' · ')
  if (!line) return null
  const rows = (
    [
      ['Model', run.model],
      ['Provider', run.provider],
      ['Input (uncached)', run.usage.input > 0 && `${run.usage.input.toLocaleString('en-US')} tokens`],
      ['Cache read', run.usage.cacheRead > 0 && `${run.usage.cacheRead.toLocaleString('en-US')} tokens`],
      ['Cache write', run.usage.cacheWrite > 0 && `${run.usage.cacheWrite.toLocaleString('en-US')} tokens`],
      ['Output', run.usage.output > 0 && `${run.usage.output.toLocaleString('en-US')} tokens`],
      ['Cost', cost > 0 && usd(cost)],
      ['Time', time && `${time}${firstMs !== undefined ? ` · first token ${duration(firstMs)}` : ''}`],
    ] as [string, string | false | undefined][]
  ).filter((r): r is [string, string] => !!r[1])
  return (
    <div
      ref={ref}
      className={`relative transition-opacity duration-[120ms] ${always || open ? '' : 'opacity-0 group-focus-within/answer:opacity-100 group-hover/answer:opacity-100 [@media(pointer:coarse)]:opacity-100'}`}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        title="Turn details"
        className="flex h-8 items-center px-1 text-label-small font-normal tabular-nums text-on-surface-variant/70 transition-colors duration-150 hover:text-on-surface aria-expanded:text-on-surface"
      >
        {line}
      </button>
      {open && (
        <div className="absolute bottom-10 left-0 z-30 w-[280px] origin-bottom-left animate-pop rounded-3xl border border-hairline bg-surface-container-lowest p-3 text-body-small shadow-float">
          <p className="mb-2 text-title-small">Turn details</p>
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 py-1">
              <span className="text-on-surface-variant">{k}</span>
              <span className="text-right font-medium tabular-nums">{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** One turn: the question, its steers, and the agent's run and answer. */
function TurnView({
  turn,
  last,
  by,
  onAsk,
  onRetry,
  onDismiss,
}: {
  turn: Turn
  last: boolean
  by?: string
  onAsk?: (text: string) => void
  onRetry?: (turn: Turn) => void
  onDismiss?: (turn: Turn) => void
}) {
  const { run } = useRun(turn.id, turn)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const act = async (f: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await f()
    } finally {
      setBusy(false)
    }
  }

  return <RunTurn turn={turn} run={run} last={last} by={by} onAsk={onAsk} onRetry={onRetry} onDismiss={onDismiss} busy={busy} act={act} copied={copied} setCopied={setCopied} />
}

/** A turn with its run: the waiting word, the activity, the answer revealed as it arrives, and its footer. */
function RunTurn({
  turn,
  run,
  last,
  by,
  onAsk,
  onRetry,
  onDismiss,
  busy,
  act,
  copied,
  setCopied,
}: {
  turn: Turn
  run?: RunState
  last: boolean
  by?: string
  onAsk?: (text: string) => void
  onRetry?: (turn: Turn) => void
  onDismiss?: (turn: Turn) => void
  busy: boolean
  act: (f: () => Promise<unknown>) => Promise<void>
  copied: boolean
  setCopied: (v: boolean) => void
}) {
  // Only what arrives now animates: a turn the member just sent, or one that streams after the thread opened.
  const arrived = useArrival(turn.client_key ?? turn.id, !!turn.client_key)
  const [stream] = useState(() => arrived || !!turn.client_key)
  const blocks = run ? answerBlocks(run) : []
  const finished = run?.phase === 'finished'
  const textBlock = blocks.find((b) => b.type === 'text') as { markdown: string } | undefined
  const answerText = textBlock?.markdown ?? (run && run.phase !== 'finished' ? run.draft : '')
  const reveal = useSmoothReveal(answerText, stream)
  const quiet = turn.failed ? false : !run || (isLive(run) && run.steps.length === 0 && run.toolOrder.length === 0 && !run.draft && blocks.length === 0 && run.thinking.length === 0)
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const textOf = blocks.filter((b) => b.type === 'text').map((b) => plain((b as { markdown: string }).markdown)).join('\n\n')
  return (
    <div className="space-y-4">
      <div className={arrived ? 'animate-rise' : ''}>
        <Bubble turn={turn} by={by} />
      </div>
      {turn.failed && (
        <div role="alert" className="flex animate-fade items-center justify-end gap-2 text-body-small">
          <IconError width={15} height={15} className="text-error" />
          <span className="text-error">{turn.failed}</span>
          {onRetry && (
            <button type="button" onClick={() => onRetry(turn)} className="font-medium text-primary">
              Retry
            </button>
          )}
          {onDismiss && (
            <button type="button" onClick={() => onDismiss(turn)} className="text-on-surface-variant hover:text-on-surface">
              Remove
            </button>
          )}
        </div>
      )}
      {run && <Steers run={run} onAsk={onAsk} />}
      <div className="flex gap-3">
        <Mascot />
        <div className="group/answer min-w-0 flex-1 space-y-4">
          {quiet && (!run || isLive(run)) && <Waiting />}
          {turn.failed && !run && <p className="text-body-small text-on-surface-variant">Not sent.</p>}
          {run?.compactions.map((c, i) => (
            <CompactionDivider key={i} summary={c.summary} before={c.before} after={c.after} />
          ))}
          {run?.compacting && <Compacting />}
          {run && <RunCard run={run} turnId={turn.id} />}
          {run?.phase === 'awaiting_input' && run.clarify && last && <ClarifyCard questions={run.clarify} busy={busy} onAnswer={(answers: Answers) => void act(() => answerTurn(turn.id, { answers }))} />}
          {run && (
            <Blocks
              blocks={blocks}
              sources={run.sources}
              turnId={turn.id}
              onAsk={last && finished ? onAsk : undefined}
              reveal={answerText ? { text: reveal.shown, streaming: reveal.revealing } : undefined}
              finished={finished}
            />
          )}
          {run && <OutcomeNotice run={run} last={last} busy={busy} onContinue={() => void act(() => continueTurn(turn.id))} />}
          {run && finished && !reveal.revealing && (
            <div className="-ml-1.5 flex animate-fade flex-col">
              <div className="flex flex-wrap items-center gap-0.5">
                {textOf && (
                  <ReplyButton
                    label={copied ? 'Copied' : 'Copy reply'}
                    pressed={copied}
                    onClick={() => {
                      void navigator.clipboard?.writeText(textOf)
                      setCopied(true)
                      setTimeout(() => setCopied(false), 1200)
                    }}
                  >
                    <span aria-hidden className="ui-icon-swap">
                      <IconCopy data-shown={!copied} width={16} height={16} />
                      <IconCheck data-shown={copied} width={16} height={16} />
                    </span>
                  </ReplyButton>
                )}
                {onAsk && run.outcome?.status !== 'BUDGET' && (
                  <ReplyButton label="Ask again" onClick={() => onAsk(turn.text)}>
                    <IconRetry width={16} height={16} />
                  </ReplyButton>
                )}
                <TurnMeta run={run} always={false} />
                <SourcesButton sources={run.sources} open={sourcesOpen} onToggle={() => setSourcesOpen((o) => !o)} />
              </div>
              {run.sources.length > 0 && (
                <div className="act-disclosure pl-1.5" data-open={sourcesOpen ? '' : undefined} inert={!sourcesOpen}>
                  <div className="pr-1">
                    <SourceList sources={run.sources} />
                  </div>
                </div>
              )}
            </div>
          )}
          {run && last && isLive(run) && (
            <div className="-ml-1.5 flex">
              <TurnMeta run={run} always />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * The chat: its turns and the ask box, with the sources or a document
 * beside it and a tool call floating over it. Without a conversation it is the new
 * chat home; the first question opens one. subject opens a record's shared
 * chat instead.
 */
export function ChatView({
  conversationId,
  subject,
  header,
  empty,
  onCreated,
  placeholder,
}: {
  conversationId?: string
  subject?: { kind: SubjectKind; id: string; label: string }
  header?: ReactNode
  /** What a new chat shows above the ask box. */
  empty?: (box: ReactNode) => ReactNode
  onCreated?: (id: string) => void
  placeholder?: string
}) {
  const me = useMe()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const conversation = useConversation(conversationId)
  const turns = useMemo(() => conversation.data?.turns ?? [], [conversation.data])
  const lastTurn = turns[turns.length - 1]
  const { run: lastRun } = useRun(lastTurn?.id, lastTurn)
  const client = useQueryClient()
  const agents = usePickableAgents()
  const skills = useSkills()
  const skillCommands = useSkillCommands()
  const [draft, setDraft] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [skill, setSkill] = useState<Skill>()
  const [agentId, setAgentId] = useState<string | undefined>(() => params.get('agent') ?? undefined)
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [panel, setPanel] = useState<Panel>()
  const [leaving, setLeaving] = useState(false)
  const leaveTimer = useRef<number>(undefined)
  const opener = useRef<HTMLElement | null>(null)
  // The tool call leaves in 140 ms, then focus goes back to its row.
  const closeTool = useCallback(() => {
    setLeaving(true)
    window.clearTimeout(leaveTimer.current)
    leaveTimer.current = window.setTimeout(() => {
      setPanel(undefined)
      setLeaving(false)
      opener.current?.focus()
      opener.current = null
    }, 140)
  }, [])
  useEffect(() => () => window.clearTimeout(leaveTimer.current), [])
  const box = useRef<HTMLTextAreaElement>(null)
  // Whatever mounts while the thread opens draws still (lib/motion).
  useState(() => markThreadOpened())
  const { run: panelRun } = useRun(panel && panel.kind !== 'tool' ? panel.turnId : undefined)

  const lastAgent = lastTurn?.agent_id ?? lastRun?.agent?.id
  const chosenAgent = agentId ?? lastAgent ?? (agents.data?.items.find((a) => a.default) ?? agents.data?.items[0])?.id

  const mode: ComposerMode = !lastRun
    ? 'idle'
    : lastRun.phase === 'running'
      ? 'running'
      : lastRun.phase === 'pausing'
        ? 'pausing'
        : lastRun.phase === 'paused'
          ? 'paused'
          : lastRun.phase === 'awaiting_input'
            ? 'awaiting'
            : 'idle'
  const locked = lastRun?.outcome?.status === 'BUDGET'
  const steering = mode === 'running' || mode === 'pausing' || mode === 'paused'
  // An attachment, a skill or another agent waits in the ask box for the next turn.
  const hold =
    steering && (attachments.length > 0 || skill || (agentId && agentId !== lastAgent)) ? 'This goes with the next question, after the run ends.' : mode === 'awaiting' ? 'Answer the questions above.' : undefined

  useEffect(() => {
    box.current?.focus()
  }, [conversationId])


  // The thread follows its newest line while the member is at the bottom; scrolled up, it stays put and offers a jump back.
  const scroller = useRef<HTMLDivElement>(null)
  const [atBottom, setAtBottom] = useState(true)
  const seq = lastRun?.lastSeq ?? 0
  const toBottom = useCallback((smooth = false) => {
    const el = scroller.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  }, [])
  useEffect(() => {
    if (atBottom) toBottom()
    // atBottom is read, not followed: scrolling back down needs no jump.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turns.length, seq, toBottom])
  // The thread opens at its end.
  useEffect(() => {
    if (conversation.data) toBottom()
  }, [conversation.data?.id, toBottom]) // eslint-disable-line react-hooks/exhaustive-deps

  async function ask(text: string) {
    setError(undefined)
    // The box clears and keeps its focus at once; the question shows as a pending turn.
    const keep = { attachments, skill }
    setDraft('')
    setAttachments([])
    setSkill(undefined)
    setAtBottom(true)
    const req: TurnRequest = { text, agent_id: chosenAgent, attachments: keep.attachments.length ? keep.attachments : undefined, skill_id: keep.skill?.id }
    const pending = pendingTurn(me.id, req)
    if (!conversationId) {
      // A new chat moves at once under a temporary id; the conversation and the turn are made in the background.
      const temp = `new-${crypto.randomUUID()}`
      putTurn(client, temp, pending)
      if (onCreated) onCreated(temp)
      else navigate(`/agent/${temp}`)
      void startChat(client, temp, pending, req, subject ? { kind: subject.kind, id: subject.id } : undefined, (id) => {
        if (location.pathname.endsWith(temp)) navigate(`/agent/${id}`, { replace: true })
      })
      return
    }
    requestAnimationFrame(() => toBottom(true))
    await send2(pending, req)
  }

  /** Posts a pending turn in this chat; a turn already open takes the text as a steer instead. */
  async function send2(pending: Turn, req: TurnRequest) {
    const target = isTempChat(conversationId) ? conversation.data?.real_id : conversationId
    if (isTempChat(conversationId) && !target) {
      // The conversation was never made: try the whole new chat again.
      void startChat(client, conversationId!, pending, req, subject ? { kind: subject.kind, id: subject.id } : undefined, (id) => {
        if (location.pathname.endsWith(conversationId!)) navigate(`/agent/${id}`, { replace: true })
      })
      return
    }
    try {
      await postTurn(client, conversationId!, target!, pending, req)
      if (isTempChat(conversationId)) {
        const d = client.getQueryData<ConversationDetail>(detailKey(conversationId!))
        if (d) client.setQueryData(detailKey(target!), { ...d, id: target, real_id: undefined })
        navigate(`/agent/${target}`, { replace: true })
      }
    } catch (e) {
      if (failureOf(e) === 'busy' && lastTurn && lastRun && (isLive(lastRun) || lastRun.phase === 'paused')) {
        dropTurn(client, conversationId!, pending.client_key!)
        await steerTurn(lastTurn.id, req.text).catch(() => undefined)
      }
    }
  }

  function retry(t: Turn) {
    void send2(t, { text: t.text, agent_id: t.agent_id, attachments: t.attachments, skill_id: t.skill_id })
  }

  async function send(text: string) {
    if (steering && lastTurn) {
      setDraft('')
      setBusy(true)
      try {
        await steerTurn(lastTurn.id, text)
        requestAnimationFrame(() => toBottom(true))
      } catch (e) {
        setDraft((d) => d || text)
        setError(controlFailure(e))
      } finally {
        setBusy(false)
      }
      return
    }
    await ask(text)
  }

  async function control(f: () => Promise<unknown>) {
    setBusy(true)
    try {
      await f()
    } catch (e) {
      setError(controlFailure(e))
    } finally {
      setBusy(false)
    }
  }

  const chips: Chip[] = [
    ...(subject && !conversationId ? [{ key: 'subject', icon: subject.kind === 'ticket' ? attachIcon.ticket : attachIcon.account, label: subject.label }] : []),
    ...attachments.map((a) => ({
      key: a.kind + a.id,
      icon: attachIcon[a.kind],
      label: a.label ?? `${a.kind} ${shortId(a.id)}`,
      tone: attachTone[a.kind],
      onRemove: () => setAttachments((xs) => xs.filter((x) => x !== a)),
    })),
    ...(skill ? [{ key: 'skill', icon: <IconBolt width={13} height={13} />, label: `/${skill.slug}`, onRemove: () => setSkill(undefined) }] : []),
  ]

  const composer = locked ? (
    <BudgetLock />
  ) : (
    <>
      {mode === 'paused' && lastTurn && (
        <PausedStrip
          steps={lastRun?.pause?.stepsDone ?? lastRun?.steps.filter((s) => s.done).length ?? 0}
          busy={busy}
          onContinue={() => void control(() => continueTurn(lastTurn.id))}
          onEnd={() => void control(() => endTurn(lastTurn.id))}
        />
      )}
      <Composer
        value={draft}
        onChange={(v) => {
          setDraft(v)
          setError(undefined)
        }}
        onSend={(t) => void send(t)}
        mode={mode}
        onPause={lastTurn ? () => void control(() => pauseTurn(lastTurn.id)) : undefined}
        onStopNow={lastTurn ? () => void control(() => stopTurn(lastTurn.id)) : undefined}
        chips={chips}
        attachMenu={(close) => (
          <AttachMenu
            onPick={(a) => {
              close()
              setAttachments((xs) => (xs.some((x) => x.kind === a.kind && x.id === a.id) ? xs : [...xs, a]))
            }}
          />
        )}
        skills={skills.data?.items ?? []}
        onSkill={setSkill}
        onMakeSkill={
          lastTurn
            ? (name) =>
                skillCommands.create.mutate(
                  { name, description: lastTurn.text.slice(0, 80), prompt: lastTurn.text, variables: variablesOf(lastTurn.text) },
                  { onError: (e) => setError(skillFailure(e)) },
                )
            : undefined
        }
        agents={agents.data?.items ?? []}
        agentId={chosenAgent}
        onAgent={setAgentId}
        meter={lastRun?.meter}
        placeholder={
          mode === 'awaiting'
            ? 'Answer the questions above'
            : steering
              ? 'Add to the request…'
              : (placeholder ?? (conversationId ? 'Ask a follow-up…' : 'Ask about a ticket, a report or an account…'))
        }
        error={error}
        hold={hold}
        up={!!conversationId}
        inputRef={box}
      />
    </>
  )

  const api: PanelApi = {
    panel,
    open: (p) => {
      if (!p && panel?.kind === 'tool') return closeTool()
      window.clearTimeout(leaveTimer.current)
      setLeaving(false)
      // A tool call gives focus back to what opened it when it closes.
      if (p?.kind === 'tool') opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      setPanel(p)
    },
    sourcesOf: (turnId) => runOf(turnId)?.sources ?? [],
  }
  const shared = !!conversation.data?.subject_kind
  const by = (t: Turn) => (shared ? `${t.member_id === me.id ? 'You' : shortId(t.member_id)} · ${time(t.created_at)}` : undefined)
  const notFound = conversation.error instanceof ApiError && conversation.error.status === 404

  return (
    <PanelContext value={api}>
      <div className="relative flex min-w-0 flex-1">
        {!conversationId && empty ? (
          empty(composer)
        ) : (
          <section className="flex min-w-0 flex-1 flex-col">
            {header}
            <div
              ref={scroller}
              onScroll={(e) => {
                const el = e.currentTarget
                setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80)
              }}
              className="flex min-h-0 flex-1 flex-col overflow-y-auto"
            >
              <span className="flex-1" />
              <div className="mx-auto w-full max-w-[800px] space-y-7 px-8 py-6">
                {notFound && <p className="text-body-medium text-on-surface-variant">{failureText.not_found}</p>}
                {turns.map((t, i) => (
                  <TurnView
                    key={t.client_key ?? t.id}
                    turn={t}
                    last={i === turns.length - 1}
                    by={by(t)}
                    onAsk={(text) => void send(text)}
                    onRetry={retry}
                    onDismiss={(x) => x.client_key && dropTurn(client, conversationId!, x.client_key)}
                  />
                ))}
              </div>
            </div>
            <div className="relative mx-auto w-full max-w-[800px] px-8 pb-5">
              {!atBottom && turns.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setAtBottom(true)
                    toBottom(true)
                  }}
                  className="absolute -top-12 left-1/2 inline-flex h-9 -translate-x-1/2 animate-fade items-center gap-1.5 rounded-full border border-hairline bg-surface-container-lowest px-3.5 text-label-medium shadow-float"
                >
                  Jump to latest
                  <IconDown width={16} height={16} />
                </button>
              )}
              {composer}
            </div>
          </section>
        )}
        {panel?.kind === 'tool' && <ToolOverlay key={panel.id} id={panel.id} leaving={leaving} onClose={closeTool} />}
        {panel?.kind === 'sources' && <SourcesPanel sources={panelRun?.sources ?? []} active={panel.n} />}
        {panel?.kind === 'doc' && <DocumentPanel key={panel.id} id={panel.id} version={panel.version} sources={panelRun?.sources ?? []} turnId={panel.turnId ?? ''} />}
      </div>
    </PanelContext>
  )
}

