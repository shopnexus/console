import { memo, type ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router'
import IconCheck from '~icons/material-symbols-light/check-rounded'
import IconCopy from '~icons/material-symbols-light/content-copy-outline-rounded'
import IconError from '~icons/material-symbols-light/error-outline-rounded'
import IconPause from '~icons/material-symbols-light/pause-circle-outline-rounded'
import IconPlay from '~icons/material-symbols-light/play-arrow-rounded'
import IconRetry from '~icons/material-symbols-light/refresh-rounded'
import IconBolt from '~icons/material-symbols-light/bolt-outline-rounded'
import IconDown from '~icons/material-symbols-light/arrow-downward-rounded'
import IconReply from '~icons/material-symbols-light/reply-rounded'
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
  type Turn,
  useConversation,
  useRun,
  useSkillCommands,
  useSkills,
  pendingTurn,
  putTurn,
  dropTurn,
  sendTurn,
  attachmentFromParams,
  type TurnRequest,
  skillFailure,
  variablesOf,
} from '../../lib/agent'
import { ApiError, shortId } from '../../lib/api'
import { useCopy, useDismiss, useNow } from '../../lib/dom'
import { markThreadOpened, useArrival, useSmoothReveal } from '../../lib/motion'
import { clock, compact, duration, int, time, usd } from '../../lib/format'
import { type Panel, PanelContext, type PanelApi } from '../../lib/panel'
import { answerBlocks, type Block, canContinue, counts, elapsed, isLive, outcomeGroup, type RunPhase, type RunState } from '../../lib/run'
import { plain } from '../../lib/markdown'
import { useMe } from '../../lib/session'
import { usePickableAgents } from '../../lib/settings'
import type { Command } from '../../lib/commands'
import { AttachMenu, type NearRecords } from '../AttachMenu'
import { RecordIcon } from '../kindLook'
import { Btn, Mascot, Spinner } from '../ui'
import { Blocks, SourceList, SourcesButton } from './Answer'
import { ClarifyCard } from './Clarify'
import { BudgetLock, type Chip, Composer, type ComposerMode, PausedStrip } from './Composer'
import { DocumentPanel, Overlay, RecordPanel, SourcesPanel, ToolPanel } from './Panels'
import { CompactionDivider, Compacting, RunCard, Waiting } from './Run'

const attachTone: Record<Attachment['kind'], string> = {
  ticket: 'bg-secondary-container/60',
  account: 'bg-primary/7',
  report_case: 'bg-surface-container',
  order: 'bg-surface-container',
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
              <RecordIcon kind={a.kind} size={13} />
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
      <section className="overflow-hidden rounded-4xl border border-hairline bg-surface-container-lowest shadow-soft">
        <div className="flex items-start gap-3 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-container text-on-surface-variant">
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
      <span className={g === 'broken' ? 'text-error' : 'text-on-surface-variant'}>{g === 'stopped' ? <IconPause width={19} height={19} /> : <IconError width={19} height={19} />}</span>
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
 * the turn's details. Every answer shows it; the latest shows it while it
 * runs too, without a time, since the activity line already ticks. What is unknown or zero is left out, and with nothing left it is
 * not drawn.
 */
function TurnMeta({ run }: { run: RunState }) {
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
      ['Input (uncached)', run.usage.input > 0 && `${int(run.usage.input)} tokens`],
      ['Cache read', run.usage.cacheRead > 0 && `${int(run.usage.cacheRead)} tokens`],
      ['Cache write', run.usage.cacheWrite > 0 && `${int(run.usage.cacheWrite)} tokens`],
      ['Output', run.usage.output > 0 && `${int(run.usage.output)} tokens`],
      ['Cost', cost > 0 && usd(cost)],
      ['Time', time && `${time}${firstMs !== undefined ? ` · first token ${duration(firstMs)}` : ''}`],
    ] as [string, string | false | undefined][]
  ).filter((r): r is [string, string] => !!r[1])
  return (
    <div ref={ref} className="relative">
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

/** One turn: the question, its steers, the waiting word, the activity, the answer revealed as it arrives, and its footer. */
const TurnView = memo(function TurnView({
  turn,
  last,
  by,
  onAsk,
  onRetry,
  onDismiss,
  onReply,
}: {
  turn: Turn
  last: boolean
  by?: string
  onAsk?: (text: string) => void
  onRetry?: (turn: Turn) => void
  onDismiss?: (turn: Turn) => void
  /** Puts an answer in the reply box of the page the chat sits on. */
  onReply?: (text: string) => void
}) {
  const { run } = useRun(turn.id, turn)
  const [busy, setBusy] = useState(false)
  const [copied, copy] = useCopy()
  const act = async (f: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await f()
    } finally {
      setBusy(false)
    }
  }
  // Only what arrives now animates: a turn the member just sent, or one still
  // running when this view first saw it. A finished turn read back off the
  // chat draws whole, however late its answer loads.
  const [stream] = useState(() => !!turn.client_key || turn.status === 'pending' || turn.status === 'running')
  const arrived = useArrival(turn.client_key ?? turn.id, !!turn.client_key) && stream
  const blocks = useMemo(() => (run ? answerBlocks(run) : []), [run])
  const texts = useMemo(() => blocks.filter((b): b is Extract<Block, { type: 'text' }> => b.type === 'text'), [blocks])
  const finished = run?.phase === 'finished'
  const answerText = texts[0]?.markdown ?? (run && run.phase !== 'finished' ? run.draft : '')
  const reveal = useSmoothReveal(answerText, stream)
  const quiet = turn.failed ? false : !run || (isLive(run) && run.steps.length === 0 && run.toolOrder.length === 0 && !run.draft && blocks.length === 0 && run.thinking.length === 0)
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const textOf = useMemo(() => texts.map((b) => plain(b.markdown)).join('\n\n'), [texts])
  // An answer asked for the reply box (/reply) lands there once, when it finishes.
  useEffect(() => {
    if (!onReply || !finished || !textOf || !turn.client_key || !replyKeys.has(turn.client_key)) return
    replyKeys.delete(turn.client_key)
    onReply(textOf)
  }, [onReply, finished, textOf, turn.client_key])
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
          {run && <RunCard run={run} />}
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
                    onClick={() => copy(textOf)}
                  >
                    <span aria-hidden className="ui-icon-swap">
                      <IconCopy data-shown={!copied} width={16} height={16} />
                      <IconCheck data-shown={copied} width={16} height={16} />
                    </span>
                  </ReplyButton>
                )}
                {onReply && textOf && (
                  <ReplyButton label="Use in reply" onClick={() => onReply(textOf)}>
                    <IconReply width={16} height={16} />
                  </ReplyButton>
                )}
                {onAsk && run.outcome?.status !== 'BUDGET' && (
                  <ReplyButton label="Ask again" onClick={() => onAsk(turn.text)}>
                    <IconRetry width={16} height={16} />
                  </ReplyButton>
                )}
                <TurnMeta run={run} />
                <SourcesButton sources={run.sources} open={sourcesOpen} onToggle={() => setSourcesOpen((o) => !o)} />
              </div>
              {run.sources.length > 0 && (
                <div className="act-disclosure pl-1.5" data-open={sourcesOpen ? '' : undefined} inert={!sourcesOpen}>
                  <div className="pr-1">
                    <SourceList sources={run.sources} turnId={turn.id} />
                  </div>
                </div>
              )}
            </div>
          )}
          {run && last && isLive(run) && (
            <div className="-ml-1.5 flex">
              <TurnMeta run={run} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

/** Client keys of the turns whose answer goes to the reply box; kept here so a new chat's move to its real id keeps them. */
const replyKeys = new Set<string>()

const composerMode: Partial<Record<RunPhase, ComposerMode>> = { running: 'running', pausing: 'pausing', paused: 'paused', awaiting_input: 'awaiting' }

/**
 * The chat: its turns and the ask box, with the sources or a document
 * beside it and a tool call floating over it. Without a conversation it is the new
 * chat home; the first question opens one. A record's page passes the
 * record as attach, its nearby records as here, and its own commands.
 */
export function ChatView({
  conversationId,
  header,
  empty,
  onCreated,
  onReady,
  placeholder,
  attach,
  here,
  commands,
  onReply,
  firstAsk,
  compact = false,
}: {
  conversationId?: string
  header?: ReactNode
  /** What a new chat shows above the ask box; ask sends a question in it. */
  empty?: (box: ReactNode, ask: (text: string) => void) => ReactNode
  /** A new chat moved under its temporary id; onReady gets the real one for it. Without them the chat goes to /agent. */
  onCreated?: (id: string) => void
  onReady?: (id: string, temp: string) => void
  placeholder?: string
  /** Records a new chat starts with in its ask box. */
  attach?: Attachment[]
  here?: NearRecords
  commands?: Command[]
  onReply?: (text: string) => void
  /** A question a new chat asks as it opens. */
  firstAsk?: string
  /** The narrow side-panel layout. */
  compact?: boolean
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
  // A record's page opens a new chat with the record attached (askHref).
  const [attachments, setAttachments] = useState<Attachment[]>(() => {
    if (conversationId) return []
    const a = attachmentFromParams(params)
    return [...(attach ?? []), ...(a ? [a] : [])]
  })
  const [skill, setSkill] = useState<Skill>()
  const [agentId, setAgentId] = useState<string | undefined>(() => params.get('agent') ?? undefined)
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [panel, setPanel] = useState<Panel>()
  const [leaving, setLeaving] = useState(false)
  const leaveTimer = useRef<number>(undefined)
  // What opened each overlay, which gets focus back when it closes.
  const openers = useRef<{ tool?: HTMLElement; sources?: HTMLElement }>({})
  // The top overlay leaves in 140 ms; a tool call opened from the sources gives way to them.
  const closePanel = useCallback(() => {
    const kind = panel?.kind === 'tool' ? 'tool' : 'sources'
    const next = panel?.kind === 'tool' ? panel.back : undefined
    setLeaving(true)
    window.clearTimeout(leaveTimer.current)
    leaveTimer.current = window.setTimeout(() => {
      setLeaving(false)
      setPanel(next)
      openers.current[kind]?.focus()
      openers.current[kind] = undefined
    }, 140)
  }, [panel])
  useEffect(() => () => window.clearTimeout(leaveTimer.current), [])
  const box = useRef<HTMLTextAreaElement>(null)
  // Whatever mounts while the thread opens draws still (lib/motion).
  useState(() => markThreadOpened())
  const sourcesPanel = panel?.kind === 'sources' ? panel : panel?.kind === 'tool' ? panel.back : undefined
  const { run: panelRun } = useRun(sourcesPanel?.turnId ?? (panel?.kind === 'doc' ? panel.turnId : undefined))

  const lastAgent = lastTurn?.agent_id ?? lastRun?.agent?.id
  const chosenAgent = agentId ?? lastAgent ?? (agents.data?.items.find((a) => a.default) ?? agents.data?.items[0])?.id

  const mode: ComposerMode = (lastRun && composerMode[lastRun.phase]) ?? 'idle'
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
  const thread = useRef<HTMLDivElement>(null)
  const [atBottom, setAtBottom] = useState(true)
  const follow = useRef(true)
  const lastTop = useRef(0)
  const stick = useCallback((v: boolean) => {
    follow.current = v
    setAtBottom(v)
  }, [])
  const toBottom = useCallback((smooth = false) => {
    const el = scroller.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  }, [])
  // Only a scroll upward leaves the bottom, so a smooth scroll down or growing text never stops the follow.
  const onScroll = useCallback(() => {
    const el = scroller.current
    if (!el) return
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 80) stick(true)
    else if (el.scrollTop < lastTop.current) stick(false)
    lastTop.current = el.scrollTop
  }, [stick])
  const threaded = !!conversationId || !empty
  // Any growth of the thread (a token, the reveal, an opened step) keeps the end in view while following.
  useEffect(() => {
    const el = thread.current
    if (!el) return
    const ro = new ResizeObserver(() => follow.current && toBottom())
    ro.observe(el)
    return () => ro.disconnect()
  }, [toBottom, threaded])
  // The thread opens at its end.
  useEffect(() => {
    if (conversation.data) toBottom()
  }, [conversation.data?.id, toBottom]) // eslint-disable-line react-hooks/exhaustive-deps

  async function ask(text: string, opts?: { toReply?: boolean }) {
    setError(undefined)
    // The box clears and keeps its focus at once; the question shows as a pending turn.
    const keep = { attachments, skill }
    setDraft('')
    setAttachments([])
    setSkill(undefined)
    stick(true)
    // The server takes labels of at most 120 characters.
    const attached = keep.attachments.map((x) => ({ ...x, label: x.label?.slice(0, 120) }))
    const req: TurnRequest = { text, agent_id: chosenAgent, attachments: attached.length ? attached : undefined, skill_id: keep.skill?.id }
    const pending = pendingTurn(me.id, req)
    if (opts?.toReply && pending.client_key) replyKeys.add(pending.client_key)
    if (!conversationId) {
      // A new chat moves at once under a temporary id; the conversation and the turn are made in the background.
      const temp = `new-${crypto.randomUUID()}`
      putTurn(client, temp, pending)
      if (onCreated) onCreated(temp)
      else navigate(`/agent/${temp}`)
      void postPending(temp, pending, req)
      return
    }
    requestAnimationFrame(() => toBottom(true))
    await postPending(conversationId, pending, req)
  }

  /** Posts a pending turn in the chat; a turn already open takes the text as a steer instead. A new chat moves to its real id once it has one. */
  async function postPending(chatId: string, pending: Turn, req: TurnRequest) {
    try {
      await sendTurn(client, chatId, pending, req, (id) => {
        if (onReady) onReady(id, chatId)
        else if (location.pathname.endsWith(chatId)) navigate(`/agent/${id}`, { replace: true })
      })
    } catch (e) {
      if (failureOf(e) === 'busy' && lastTurn && lastRun && (isLive(lastRun) || lastRun.phase === 'paused')) {
        dropTurn(client, chatId, pending.client_key!)
        await steerTurn(lastTurn.id, req.text).catch(() => undefined)
      }
    }
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
    ...attachments.map((a) => ({
      key: a.kind + a.id,
      icon: <RecordIcon kind={a.kind} size={13} />,
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
            here={here}
            onPick={(a) => {
              close()
              setAttachments((xs) => (xs.some((x) => x.kind === a.kind && x.id === a.id) ? xs : [...xs, a]))
            }}
          />
        )}
        skills={skills.data?.items ?? []}
        onSkill={setSkill}
        commands={commands}
        onCommand={(c, arg) => c.run(arg, { ask: (t, o) => void latest.current.ask(t, o) })}
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
        up={!!conversationId || compact}
        inputRef={box}
      />
    </>
  )

  const api = useMemo<PanelApi>(() => ({
    panel,
    open: (p) => {
      if (!p && (panel?.kind === 'tool' || panel?.kind === 'sources')) return closePanel()
      window.clearTimeout(leaveTimer.current)
      setLeaving(false)
      const from = document.activeElement instanceof HTMLElement ? document.activeElement : undefined
      if (p?.kind === 'tool') {
        openers.current.tool = from
        setPanel({ ...p, back: p.back ?? sourcesPanel })
        return
      }
      if (p?.kind === 'sources' && panel?.kind !== 'sources') openers.current.sources = from
      setPanel(p)
    },
    sourcesOf: (turnId) => runOf(turnId)?.sources ?? [],
  }), [panel, sourcesPanel, closePanel])
  // The turns get callbacks that keep their identity, so a token or a key press redraws only what changed.
  const latest = useRef({ send, postPending, ask })
  useLayoutEffect(() => {
    latest.current = { send, postPending, ask }
  })
  // A chat opened with a question asks it once, as if typed.
  const asked = useRef(false)
  useEffect(() => {
    if (!firstAsk || conversationId || asked.current) return
    asked.current = true
    void latest.current.ask(firstAsk)
  }, [firstAsk, conversationId])
  const onAsk = useCallback((text: string) => void latest.current.send(text), [])
  const onRetry = useCallback((t: Turn) => void latest.current.postPending(conversationId!, t, { text: t.text, agent_id: t.agent_id, attachments: t.attachments, skill_id: t.skill_id }), [conversationId])
  const onDismiss = useCallback((x: Turn) => x.client_key && dropTurn(client, conversationId!, x.client_key), [client, conversationId])
  const shared = !!conversation.data?.subject_kind
  const by = (t: Turn) => (shared ? `${t.member_id === me.id ? 'You' : shortId(t.member_id)} · ${time(t.created_at)}` : undefined)
  const notFound = conversation.error instanceof ApiError && conversation.error.status === 404

  return (
    <PanelContext value={api}>
      <div className="relative flex min-h-0 min-w-0 flex-1">
        {!threaded && empty ? (
          empty(composer, (t) => void latest.current.ask(t))
        ) : (
          <section className="flex min-w-0 flex-1 flex-col">
            {header}
            <div
              ref={scroller}
              onScroll={onScroll}
              className="flex min-h-0 flex-1 flex-col overflow-y-auto"
            >
              <span className="flex-1" />
              <div ref={thread} className={`mx-auto w-full max-w-[800px] space-y-7 ${compact ? 'px-4 py-4' : 'px-8 py-6'}`}>
                {notFound && <p className="text-body-medium text-on-surface-variant">{failureText.not_found}</p>}
                {turns.map((t, i) => (
                  <TurnView
                    key={t.client_key ?? t.id}
                    turn={t}
                    last={i === turns.length - 1}
                    by={by(t)}
                    onAsk={onAsk}
                    onRetry={onRetry}
                    onDismiss={onDismiss}
                    onReply={onReply}
                  />
                ))}
              </div>
            </div>
            <div className={`relative mx-auto w-full max-w-[800px] ${compact ? 'px-3 pb-3' : 'px-8 pb-5'}`}>
              {!atBottom && turns.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    stick(true)
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
        {sourcesPanel && (
          <Overlay key="sources" label="Sources" width="w-[420px]" leaving={leaving && panel?.kind === 'sources'} active={panel?.kind === 'sources'} onClose={closePanel}>
            <SourcesPanel sources={panelRun?.sources ?? []} active={sourcesPanel.n} tools={panelRun?.tools} />
          </Overlay>
        )}
        {panel?.kind === 'tool' && (
          <Overlay key={panel.id} label="Tool call" leaving={leaving} onClose={closePanel}>
            <ToolPanel id={panel.id} bare />
          </Overlay>
        )}
        {panel?.kind === 'doc' && <DocumentPanel key={panel.id} id={panel.id} version={panel.version} sources={panelRun?.sources ?? []} turnId={panel.turnId ?? ''} />}
        {panel?.kind === 'record' && <RecordPanel key={`${panel.record}-${panel.id}`} record={panel.record} id={panel.id} label={panel.label} turnId={panel.turnId} />}
      </div>
    </PanelContext>
  )
}

