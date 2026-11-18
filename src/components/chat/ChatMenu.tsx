import { useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router'
import IconDelete from '~icons/material-symbols-light/delete-outline-rounded'
import IconEdit from '~icons/material-symbols-light/edit-outline-rounded'
import IconMore from '~icons/material-symbols-light/more-horiz'
import { type Conversation, conversationFailure, threadTitle, useDeleteConversation, useRenameConversation } from '../../lib/agent'
import { useMe } from '../../lib/session'
import { Btn } from '../ui'

/**
 * A chat's ⋯ menu, on its row in the sidebar and in its header: Rename, and
 * Delete after a confirm. A ticket's or an account's shared chat is an
 * admin's to change, so a moderator gets no menu for it. Deleting the open
 * chat goes to New chat.
 */
export function ChatMenu({ c, className = '' }: { c: Conversation; className?: string }) {
  const me = useMe()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const rename = useRenameConversation()
  const remove = useDeleteConversation()
  const [at, setAt] = useState<{ left: number; top: number }>()
  const [view, setView] = useState<'menu' | 'rename' | 'delete'>('menu')
  const [title, setTitle] = useState('')
  const close = useCallback(() => {
    setAt(undefined)
    setView('menu')
    rename.reset()
    remove.reset()
  }, [rename, remove])
  if (c.subject_kind && me.role !== 'admin') return null
  const failure = rename.error ?? remove.error
  const item = 'flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-label-medium font-normal hover:bg-surface-container-low'
  return (
    <>
      <button
        type="button"
        title="More"
        aria-label={`More for ${threadTitle(c)}`}
        aria-expanded={!!at}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          const r = e.currentTarget.getBoundingClientRect()
          setAt({ left: Math.min(r.left, window.innerWidth - 268), top: r.bottom + 4 })
          setTitle(threadTitle(c))
        }}
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-on-surface-variant hover:bg-on-surface/8 ${className}`}
      >
        <IconMore width={17} height={17} />
      </button>
      {at &&
        createPortal(
          <>
            <div className="fixed inset-0 z-40" onPointerDown={close} />
            <div
              style={at}
              onKeyDown={(e) => e.key === 'Escape' && close()}
              className="fixed z-50 w-[260px] origin-top-left animate-pop rounded-3xl border border-hairline bg-surface-container-lowest p-1.5 shadow-float"
            >
              {view === 'menu' && (
                <>
                  <button type="button" autoFocus className={item} onClick={() => setView('rename')}>
                    <IconEdit width={17} height={17} />
                    Rename
                  </button>
                  <button type="button" className={`${item} text-error`} onClick={() => setView('delete')}>
                    <IconDelete width={17} height={17} />
                    Delete
                  </button>
                </>
              )}
              {view === 'rename' && (
                <form
                  className="space-y-2 p-1.5"
                  onSubmit={(e) => {
                    e.preventDefault()
                    const t = title.trim()
                    if (!t) return
                    rename.mutate({ id: c.id, title: t }, { onSuccess: close })
                  }}
                >
                  <input
                    autoFocus
                    value={title}
                    maxLength={80}
                    onChange={(e) => setTitle(e.target.value)}
                    aria-label="Title"
                    className="h-10 w-full rounded-xl border border-hairline bg-surface-container-lowest px-3 text-body-medium outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                  />
                  <div className="flex justify-end gap-2">
                    <Btn onClick={close}>Cancel</Btn>
                    <Btn type="submit" kind="primary" disabled={!title.trim() || rename.isPending}>
                      Save
                    </Btn>
                  </div>
                </form>
              )}
              {view === 'delete' && (
                <div className="space-y-2 p-1.5">
                  <p className="text-title-small">Delete this chat?</p>
                  <p className="text-body-small text-on-surface-variant">Its answers and documents go with it.</p>
                  <div className="flex justify-end gap-2 pt-1">
                    <Btn autoFocus onClick={close}>
                      Cancel
                    </Btn>
                    <Btn
                      kind="danger-fill"
                      disabled={remove.isPending}
                      onClick={() => {
                        const open = pathname === `/agent/${c.id}`
                        remove.mutate(c.id, {
                          onSuccess: () => {
                            close()
                            if (open) navigate('/', { replace: true })
                          },
                        })
                      }}
                    >
                      Delete
                    </Btn>
                  </div>
                </div>
              )}
              {failure && <p className="px-2.5 pb-1.5 text-body-small text-error">{conversationFailure(failure)}</p>}
            </div>
          </>,
          document.body,
        )}
    </>
  )
}
