import { Link, useNavigate, useParams } from 'react-router'
import IconOpen from '~icons/material-symbols-light/north-east-rounded'
import { ChatView } from '../components/chat/Chat'
import { ChatMenu } from '../components/chat/ChatMenu'
import { Shell } from '../components/Shell'
import { SubjectIcon } from '../components/SubjectIcon'
import { isTempChat, threadTitle, useConversation, useSubjectLabel, useThreads } from '../lib/agent'
import { firstName, greeting, when } from '../lib/format'
import { useMe } from '../lib/session'

/**
 * The agent: / is a new chat, /agent/:id one chat. A record's shared chat
 * (a ticket's, an account's) links back to the record in its header.
 */
export function Agent() {
  const { id } = useParams()
  const navigate = useNavigate()
  const me = useMe()
  const threads = useThreads()
  const conversation = useConversation(id)
  const c = conversation.data
  const subject = c?.subject_kind && c.subject_id ? { kind: c.subject_kind, id: c.subject_id } : undefined
  const subjectLabel = useSubjectLabel(subject?.kind, subject?.id)
  const href = subject ? (subject.kind === 'ticket' ? `/support/${subject.id}` : `/accounts/${subject.id}`) : undefined

  return (
    <Shell>
      <ChatView
        key={id ?? 'new'}
        conversationId={id}
        onCreated={(cid) => navigate(`/agent/${cid}`)}
        header={
          <header className="flex h-14 shrink-0 items-center gap-3 px-6">
            <p className="min-w-0 flex-1 truncate text-title-small">{c ? threadTitle(c) : ''}</p>
            {c && !isTempChat(c.id) && <ChatMenu c={c} />}
            {href && subject && (
              <Link
                to={href}
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-hairline px-3 text-body-small text-on-surface-variant hover:bg-surface-container-low"
              >
                <SubjectIcon kind={subject.kind} size={15} />
                {subjectLabel}
                <IconOpen width={14} height={14} />
              </Link>
            )}
          </header>
        }
        empty={(box) => (
          <section className="band relative flex min-w-0 flex-1 flex-col items-center overflow-y-auto px-8 pt-[110px]">
            <div aria-hidden className="dots pointer-events-none absolute inset-0" />
            <img src="/art-ai-reading.webp" alt="" className="relative h-[104px] w-[104px] animate-rise object-contain" />
            <h1 className="relative mt-3 text-display-small">
              {greeting()}, {firstName(me.display_name)}
            </h1>
            <div className="relative mt-8 w-full max-w-[740px] animate-rise">{box}</div>
            {threads.items.length > 0 && (
              <div className="relative mt-14 w-full max-w-[740px] pb-10">
                <p className="mb-3 text-label-medium text-on-surface-variant">Continue</p>
                <div className="rise-list grid grid-cols-1 gap-3 md:grid-cols-3">
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
                        {t.subject_kind === 'ticket' ? 'Ticket' : t.subject_kind === 'account' ? 'Account' : 'Chat'} · <span className="tabular-nums">{when(t.updated_at)}</span>
                      </span>
                      <span className="line-clamp-2 text-title-small">{threadTitle(t)}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      />
    </Shell>
  )
}
