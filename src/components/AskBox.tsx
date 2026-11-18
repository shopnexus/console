import { type ReactNode, type Ref, useCallback, useState } from 'react'
import IconAdd from '~icons/material-symbols-light/add-rounded'
import IconClose from '~icons/material-symbols-light/close-rounded'
import IconSend from '~icons/material-symbols-light/arrow-upward-rounded'
import IconStop from '~icons/material-symbols-light/stop-rounded'
import { useDismiss } from '../lib/dom'
import { maxQuestion } from '../lib/agent'

export interface AttachedChip {
  icon: ReactNode
  label: string
  onRemove?: () => void
}

/**
 * The ask box: the question, + to attach a record (the menu comes from the
 * page), the attached record as a chip, and send. While an answer is on its
 * way send becomes stop, also on Escape. Enter sends, Shift+Enter breaks the
 * line. error shows under the box.
 */
export function AskBox({
  value,
  onChange,
  onSend,
  onStop,
  running,
  attached,
  menu,
  menuUp = false,
  placeholder,
  error,
  inputRef,
}: {
  value: string
  onChange: (v: string) => void
  onSend: (text: string) => void
  onStop: () => void
  running: boolean
  attached?: AttachedChip
  /** The + menu; it gets close to call once a record is picked. */
  menu?: (close: () => void) => ReactNode
  menuUp?: boolean
  placeholder: string
  error?: string
  inputRef?: Ref<HTMLTextAreaElement>
}) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const ref = useDismiss<HTMLDivElement>(open, close)
  const text = value.trim()
  const over = value.length > maxQuestion

  function send() {
    if (running || text === '' || over) return
    onSend(text)
  }

  return (
    <div ref={ref} className="relative">
      <div className="rounded-xl border border-hairline bg-surface-container-lowest shadow-lift focus-within:border-outline">
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              send()
            } else if (e.key === 'Escape' && running) {
              e.preventDefault()
              onStop()
            }
          }}
          rows={2}
          placeholder={placeholder}
          aria-label="Câu hỏi"
          aria-invalid={!!error || over}
          className="field-sizing-content block max-h-60 min-h-[52px] w-full resize-none bg-transparent px-3.5 pt-3 text-body-large text-on-surface outline-none placeholder:text-on-surface-variant"
        />
        <div className="flex items-center gap-2 px-2 pb-2">
          {menu && (
            <button
              type="button"
              title="Gắn ticket, tài khoản"
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
              className="flex h-8 w-8 items-center justify-center rounded-sm text-on-surface-variant hover:bg-surface-container-low"
            >
              <IconAdd width={18} height={18} />
            </button>
          )}
          {attached && (
            <span className="inline-flex h-6 min-w-0 items-center gap-1 rounded-sm bg-surface-container px-1.5 text-body-small text-on-surface-variant">
              {attached.icon}
              <span className="truncate">{attached.label}</span>
              {attached.onRemove && (
                <button type="button" title="Bỏ gắn" onClick={attached.onRemove} className="-mr-0.5 rounded-xs hover:text-on-surface">
                  <IconClose width={13} height={13} />
                </button>
              )}
            </span>
          )}
          <span className="flex-1" />
          {running ? (
            <button
              type="button"
              title="Dừng (Esc)"
              onClick={onStop}
              className="flex h-8 w-8 items-center justify-center rounded-sm bg-on-surface text-surface"
            >
              <IconStop width={18} height={18} />
            </button>
          ) : (
            <button
              type="button"
              title="Gửi (Enter)"
              onClick={send}
              disabled={text === '' || over}
              className="flex h-8 w-8 items-center justify-center rounded-sm bg-on-surface text-surface disabled:opacity-40"
            >
              <IconSend width={18} height={18} />
            </button>
          )}
        </div>
      </div>
      {(error || over) && (
        <p role="alert" className="mt-1.5 px-1 text-body-small text-error">
          {over ? `Câu hỏi dài quá ${maxQuestion} ký tự` : error}
        </p>
      )}
      {open && menu && (
        <div
          className={`absolute left-0 z-20 w-[340px] animate-pop rounded-xl bg-surface-container-lowest p-1.5 shadow-float ${
            menuUp ? 'bottom-full mb-2 origin-bottom-left' : 'top-full mt-2 origin-top-left'
          }`}
        >
          {menu(close)}
        </div>
      )}
    </div>
  )
}
