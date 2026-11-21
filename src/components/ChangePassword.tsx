import { type FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import IconClose from '~icons/material-symbols-light/close-rounded'
import IconKey from '~icons/material-symbols-light/key-outline-rounded'
import { ApiError, put } from '../lib/api'
import { useDismiss } from '../lib/dom'
import { useForgetMe, useMe } from '../lib/session'
import { passwordRules } from '../lib/password'
import { NewPassword, PasswordField } from './NewPassword'
import { Btn, IconBtn, Notice } from './ui'

/** Change password: the change ends this session, so the member signs in again with the new one. */
export function ChangePassword({ onClose }: { onClose: () => void }) {
  const me = useMe()
  const navigate = useNavigate()
  const forget = useForgetMe()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [again, setAgain] = useState('')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const ref = useDismiss<HTMLFormElement>(true, onClose)
  useEffect(() => ref.current?.querySelector('input')?.focus(), [ref])
  const rules = passwordRules(next, again, me.email, current, 'Not the current password')

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (busy || !current || !rules.every(([, ok]) => ok)) return
    setBusy(true)
    setError(undefined)
    try {
      await put('/console/me/password', { current_password: current, new_password: next })
      forget()
      navigate('/signin?changed=1', { replace: true })
    } catch (err) {
      const code = err instanceof ApiError ? err.code : ''
      setError(code === 'invalid_credentials' ? 'The current password is wrong.' : code === 'password_too_weak' ? 'The new password does not meet the rules.' : 'That did not go through.')
      setBusy(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-on-surface/18" aria-hidden />
      <form
        ref={ref}
        onSubmit={submit}
        role="dialog"
        aria-label="Change password"
        className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-32px)] w-[440px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 animate-pop overflow-y-auto rounded-5xl border border-hairline bg-surface-container-lowest p-7 shadow-float"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/8 text-primary">
            <IconKey width={22} height={22} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-title-large">Change password</h2>
            <p className="text-body-small text-on-surface-variant">You sign in again after saving</p>
          </div>
          <IconBtn title="Close" onClick={onClose} className="h-9 w-9">
            <IconClose width={20} height={20} />
          </IconBtn>
        </div>
        <div className="mt-6 space-y-4">
          <PasswordField label="Current password" autoComplete="current-password" value={current} onChange={setCurrent} />
          <NewPassword rules={rules} next={next} again={again} onNext={setNext} onAgain={setAgain} />
        </div>
        {error && (
          <div className="mt-4">
            <Notice>{error}</Notice>
          </div>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Btn big onClick={onClose}>
            Cancel
          </Btn>
          <Btn big type="submit" kind="primary" disabled={busy || !current || !rules.every(([, ok]) => ok)}>
            Save and sign in again
          </Btn>
        </div>
      </form>
    </>
  )
}
