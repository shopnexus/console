import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import IconSpark from '~icons/material-symbols/auto-awesome-rounded'
import IconOpen from '~icons/material-symbols-light/north-east-rounded'
import { AskBox } from '../components/AskBox'
import { AttachMenu } from '../components/AttachMenu'
import { MessageList, TurnNotice } from '../components/MessageList'
import { Shell } from '../components/Shell'
import { SubjectIcon, ThreadList } from '../components/ThreadList'
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
import { typing } from '../lib/dom'
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
    navigate('/agent')
    box.current?.focus()
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'n' || e.key === 'N') && !typing(e)) {
        e.preventDefault()
        newChat()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

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
      placeholder={id ? 'Hỏi tiếp' : 'Hỏi agent…'}
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
    <Shell flush>
      <ThreadList items={threads.items} onNew={newChat} fresh={!id} />
      {!id ? (
        <section className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-1 justify-center px-6 pt-[240px]">
            <div className="h-fit w-full max-w-[680px] space-y-3">
              {askBox}
              {openFailure && openFailure.at === id && <TurnNotice failure={openFailure.failure} />}
            </div>
          </div>
        </section>
      ) : (
        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-[52px] shrink-0 items-center gap-3 border-b border-hairline px-5">
            <IconSpark width={18} height={18} className="shrink-0 text-primary" />
            <p className="min-w-0 flex-1 truncate text-title-medium">{c ? threadTitle(c) : ''}</p>
            {subject?.kind === 'ticket' && (
              <Link
                to={`/support/${subject.id}`}
                className="inline-flex h-7 shrink-0 items-center gap-1 rounded-sm border border-hairline px-2 text-body-small text-on-surface-variant hover:bg-surface-container-low"
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
              <p className="mx-auto w-full max-w-[680px] px-6 py-5 text-body-medium text-on-surface-variant">
                {failureText.not_found}
              </p>
            ) : conversation.error ? (
              <div className="mx-auto w-full max-w-[680px] px-6 py-5">
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
          <div className="mx-auto w-full max-w-[680px] space-y-3 px-6 pb-5">
            {openFailure && openFailure.at === id && <TurnNotice failure={openFailure.failure} />}
            {askBox}
          </div>
        </section>
      )}
    </Shell>
  )
}
