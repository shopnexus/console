import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import IconOpen from '~icons/material-symbols-light/north-east-rounded'
import { AskBox } from '../components/AskBox'
import { AttachMenu } from '../components/AttachMenu'
import { MessageList, TurnNotice } from '../components/MessageList'
import { Shell } from '../components/Shell'
import { SubjectIcon } from '../components/SubjectIcon'
import { firstName, greeting, when } from '../lib/format'
import { ApiError } from '../lib/api'
import {
  type Failure,
  type SubjectKind,
  failureOf,
  failureText,
  threadTitle,
  useAsk,
  useConversation,
  useOpenConversation,
  useSubjectLabel,
  useThreads,
} from '../lib/agent'
import { useMe } from '../lib/session'

/**
 * Agent: the member's chats with the agent. /agent is a new chat; /agent/:id
 * one chat. Attaching a ticket or an account opens that record's chat,
 * which every member shares.
 */
export function Agent() {
  const { id } = useParams()
  const navigate = useNavigate()
  const me = useMe()
  const threads = useThreads()
  const conversation = useConversation(id)
  const asker = useAsk(me.id)
  const opener = useOpenConversation()
  const [draft, setDraft] = useState('')
  // Both belong to the chat they happened in and hide in another.
  const [inputError, setInputError] = useState<{ at?: string; text: string }>()
  const [openFailure, setOpenFailure] = useState<{ at?: string; failure: Failure }>()
  const box = useRef<HTMLTextAreaElement>(null)

  const c = conversation.data
  const subject = c?.subject_kind && c.subject_id ? { kind: c.subject_kind, id: c.subject_id } : undefined
  const subjectLabel = useSubjectLabel(subject?.kind, subject?.id)
  const running = !!id && !!asker.waiting[id]

  useEffect(() => {
    box.current?.focus()
  }, [id])

  function newChat() {
    setDraft('')
    navigate('/')
    box.current?.focus()
  }

  async function open(kind: SubjectKind, subjectId: string) {
    setOpenFailure(undefined)
    try {
      const opened = await opener.mutateAsync({ kind, id: subjectId })
      navigate(`/agent/${opened.id}`)
    } catch (e) {
      setOpenFailure({ at: id, failure: failureOf(e) })
    }
  }

  async function send(text: string) {
    setInputError(undefined)
    setOpenFailure(undefined)
    let target = id
    if (!target) {
      try {
        target = (await opener.mutateAsync(undefined)).id
      } catch (e) {
        setOpenFailure({ at: id, failure: failureOf(e) })
        return
      }
      navigate(`/agent/${target}`)
    }
    setDraft('')
    const out = await asker.send(target, text)
    if (out.ok) return
    // A stopped or refused question goes back into the box to be changed.
    if (out.failure === 'aborted' || out.failure === 'too_long') setDraft((d) => d || text)
    if (out.failure === 'too_long') setInputError({ at: target, text: failureText.too_long })
  }

  const notFound = conversation.error instanceof ApiError && conversation.error.status === 404
  const askBox = (
    <AskBox
      value={draft}
      onChange={(v) => {
        setDraft(v)
        setInputError(undefined)
      }}
      onSend={send}
      onStop={() => id && asker.stop(id)}
      running={running}
      placeholder={id ? 'Ask a follow-up…' : 'Ask about a ticket, a report or an account…'}
      error={inputError && inputError.at === id ? inputError.text : undefined}
      inputRef={box}
      menuUp={!!id}
      attached={
        subject && {
          icon: <SubjectIcon kind={subject.kind} size={14} />,
          label: subjectLabel,
          onRemove: newChat,
        }
      }
      menu={(close) => (
        <AttachMenu
          selected={subject}
          onPick={(kind, subjectId) => {
            close()
            void open(kind, subjectId)
          }}
        />
      )}
    />
  )

  return (
    <Shell>
      {!id ? (
        <section className="band relative flex min-w-0 flex-1 flex-col items-center overflow-y-auto px-8 pt-[120px]">
          <div aria-hidden className="dots pointer-events-none absolute inset-0" />
          <img src="/art-ai-reading.webp" alt="" className="relative h-[112px] w-[112px] animate-rise object-contain" />
          <h1 className="relative mt-3 text-display-small">
            {greeting()}, {firstName(me.display_name)}
          </h1>
          <div className="relative mt-8 w-full max-w-[720px] animate-rise space-y-3">
            {askBox}
            {openFailure && openFailure.at === id && <TurnNotice failure={openFailure.failure} />}
          </div>
          {threads.items.length > 0 && (
            <div className="relative mt-14 w-full max-w-[720px] pb-10">
              <p className="mb-3 text-label-medium text-on-surface-variant">Continue</p>
              <div className="rise-list grid grid-cols-3 gap-3">
                {threads.items.slice(0, 3).map((t) => (
                  <Link
                    key={t.id}
                    to={`/agent/${t.id}`}
                    className="flex flex-col gap-2 rounded-3xl border border-hairline bg-surface-container-lowest p-4 shadow-soft hover:border-primary/30"
                  >
                    <span className="flex items-center gap-1.5 text-body-small text-on-surface-variant">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/8 text-primary">
                        <SubjectIcon kind={t.subject_kind} size={14} />
                      </span>
                      {t.subject_kind === 'ticket' ? 'Ticket' : t.subject_kind === 'account' ? 'Account' : 'Chat'} ·{' '}
                      <span className="tabular-nums">{when(t.updated_at)}</span>
                    </span>
                    <span className="line-clamp-2 text-title-small">{threadTitle(t)}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      ) : (
        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center gap-3 px-6">
            <p className="min-w-0 flex-1 truncate text-title-small">{c ? threadTitle(c) : ''}</p>
            {subject?.kind === 'ticket' && (
              <Link
                to={`/support/${subject.id}`}
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-hairline px-3 text-body-small text-on-surface-variant hover:bg-surface-container-low"
              >
                <SubjectIcon kind="ticket" size={14} />
                {subjectLabel}
                <IconOpen width={13} height={13} />
              </Link>
            )}
          </header>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <span className="flex-1" />
            {notFound ? (
              <p className="mx-auto w-full max-w-[780px] px-8 py-6 text-body-medium text-on-surface-variant">
                {failureText.not_found}
              </p>
            ) : conversation.error ? (
              <div className="mx-auto w-full max-w-[780px] px-8 py-6">
                <TurnNotice failure={failureOf(conversation.error)} onRetry={() => void conversation.refetch()} />
              </div>
            ) : (
              c && (
                <MessageList
                  turns={c.turns}
                  waiting={asker.waiting[c.id]}
                  failed={asker.failed[c.id]}
                  shared={!!subject}
                  memberId={me.id}
                  onRetry={(text) => void send(text)}
                />
              )
            )}
          </div>
          <div className="mx-auto w-full max-w-[780px] space-y-3 px-8 pb-5">
            {openFailure && openFailure.at === id && <TurnNotice failure={openFailure.failure} />}
            {askBox}
          </div>
        </section>
      )}
    </Shell>
  )
}
