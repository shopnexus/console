import { useEffect, useRef, useState } from 'react'
import IconCheck from '~icons/material-symbols-light/check-rounded'
import IconCopy from '~icons/material-symbols-light/content-copy-outline-rounded'
import IconError from '~icons/material-symbols-light/error-outline-rounded'
import IconRetry from '~icons/material-symbols-light/refresh-rounded'
import IconTimer from '~icons/material-symbols-light/timer-off-outline-rounded'
import { shortId } from '../lib/api'
import { type Failed, type Failure, type Turn, type Waiting, failureText } from '../lib/agent'
import { SourceChips } from './SourceChip'

const time = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' })

/** A question the member asked, as a bubble at the end side; who asked and when under it in a shared chat. */
export function Question({ text, by }: { text: string; by?: string }) {
  return (
    <div className="flex flex-col items-end gap-1">
      <p className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-xs bg-surface-container px-3.5 py-2 text-body-large">{text}</p>
      {by && <p className="px-1 text-label-small font-normal tabular-nums text-on-surface-variant">{by}</p>}
    </div>
  )
}

/** The agent's answer: the sources it read, the plain text, then copy and ask again. */
export function AnswerView({ turn, onRetry }: { turn: Turn; onRetry?: () => void }) {
  const [copied, setCopied] = useState(false)
  const text = turn.answer ?? ''
  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Without clipboard access the button does nothing.
    }
  }
  return (
    <div className="space-y-2">
      <SourceChips sources={turn.sources} />
      <div className="space-y-2 text-body-large">
        {text
          .split(/\n{2,}/)
          .filter((p) => p.trim() !== '')
          .map((p, i) => (
            <p key={i} className="whitespace-pre-wrap">
              {p}
            </p>
          ))}
      </div>
      <div className="flex items-center gap-0.5 text-on-surface-variant">
        <button title="Chép" onClick={copy} className="flex h-7 w-7 items-center justify-center rounded-sm hover:bg-surface-container-low">
          {copied ? <IconCheck width={15} height={15} className="text-primary" /> : <IconCopy width={15} height={15} />}
        </button>
        {onRetry && (
          <button title="Hỏi lại" onClick={onRetry} className="flex h-7 w-7 items-center justify-center rounded-sm hover:bg-surface-container-low">
            <IconRetry width={15} height={15} />
          </button>
        )}
      </div>
    </div>
  )
}

/** While the answer is on its way: two grey lines. */
export function WaitingLines() {
  return (
    <div className="space-y-2 py-1" aria-busy>
      <span className="block h-2.5 w-[86%] animate-pulse rounded-full bg-surface-container" />
      <span className="block h-2.5 w-[58%] animate-pulse rounded-full bg-surface-container" />
    </div>
  )
}

/** A question without an answer: what happened, and "Hỏi lại" where asking again can help. */
export function TurnNotice({ failure, onRetry }: { failure: Failure; onRetry?: () => void }) {
  const retry = onRetry && failure !== 'budget' && failure !== 'closed' && failure !== 'not_found'
  return (
    <div className="flex items-center gap-2 rounded-lg border border-hairline px-3 py-2" role="status">
      <span className="text-error">
        {failure === 'timeout' ? <IconTimer width={18} height={18} /> : <IconError width={18} height={18} />}
      </span>
      <p className="min-w-0 flex-1 text-body-medium">{failureText[failure]}</p>
      {retry && (
        <button
          onClick={onRetry}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-sm px-3 text-label-large text-primary hover:bg-surface-container-low"
        >
          <IconRetry width={16} height={16} />
          Hỏi lại
        </button>
      )}
    </div>
  )
}

const statusFailure: Partial<Record<Turn['status'], Failure>> = { timed_out: 'timeout', failed: 'other' }

/**
 * A conversation's turns, oldest first, then the question waiting for its
 * answer or the last one that failed. shared shows who asked under each
 * question. Scrolls to the newest on a change.
 */
export function MessageList({
  turns,
  waiting,
  failed,
  shared,
  memberId,
  onRetry,
}: {
  turns: Turn[]
  waiting?: Waiting
  failed?: Failed
  shared: boolean
  memberId: string
  onRetry: (text: string) => void
}) {
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' })
  }, [turns.length, waiting, failed])
  // The API names the asker by member id only; the console knows its own member.
  const by = (member: string, at: string) =>
    shared ? `${member === memberId ? 'Bạn' : shortId(member)} · ${time.format(new Date(at))}` : undefined
  return (
    <div className="mx-auto w-full max-w-[680px] space-y-4 px-6 py-5">
      {turns.map((t) => (
        <div key={t.id} className="space-y-4">
          <Question text={t.text} by={by(t.member_id, t.created_at)} />
          {t.status === 'running' ? (
            <div className="space-y-2">
              <SourceChips sources={t.sources} />
              <WaitingLines />
            </div>
          ) : t.answer !== undefined && t.status === 'succeeded' ? (
            <AnswerView turn={t} onRetry={() => onRetry(t.text)} />
          ) : t.status === 'cancelled' ? null : (
            <div className="space-y-2">
              <SourceChips sources={t.sources} />
              <TurnNotice failure={statusFailure[t.status] ?? 'other'} onRetry={() => onRetry(t.text)} />
            </div>
          )}
        </div>
      ))}
      {waiting && (
        <div className="space-y-4">
          <Question text={waiting.text} by={by(memberId, waiting.at)} />
          <WaitingLines />
        </div>
      )}
      {failed && (
        <div className="space-y-4">
          <Question text={failed.text} by={by(memberId, failed.at)} />
          <TurnNotice failure={failed.failure} onRetry={() => onRetry(failed.text)} />
        </div>
      )}
      <div ref={end} />
    </div>
  )
}
