import { useState } from 'react'
import IconLock from '~icons/material-symbols-light/lock-outline'
import IconDone from '~icons/material-symbols/check-circle-rounded'
import IconTodo from '~icons/material-symbols/radio-button-unchecked'
import IconHidden from '~icons/material-symbols/visibility-off-outline-rounded'
import IconShown from '~icons/material-symbols/visibility-outline-rounded'
import { Field } from './Field'

/** A password field with a button that shows what is typed. */
export function PasswordField(props: { label: string; value: string; onChange: (v: string) => void; autoComplete: string; autoFocus?: boolean }) {
  const [shown, setShown] = useState(false)
  return (
    <Field
      label={props.label}
      type={shown ? 'text' : 'password'}
      autoComplete={props.autoComplete}
      autoFocus={props.autoFocus}
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      icon={<IconLock width={18} height={18} />}
      required
      trailing={
        <button
          type="button"
          title={shown ? 'Hide password' : 'Show password'}
          onClick={() => setShown(!shown)}
          className="-mr-1.5 flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-low"
        >
          {shown ? <IconHidden width={18} height={18} /> : <IconShown width={18} height={18} />}
        </button>
      }
    />
  )
}

/** New password and Again, with a meter of the rules met and the rules listed. */
export function NewPassword({
  rules,
  next,
  again,
  onNext,
  onAgain,
  autoFocus,
}: {
  rules: [string, boolean][]
  next: string
  again: string
  onNext: (v: string) => void
  onAgain: (v: string) => void
  autoFocus?: boolean
}) {
  const met = rules.filter(([, ok]) => ok).length
  return (
    <>
      <div className="space-y-4">
        <PasswordField label="New password" autoComplete="new-password" autoFocus={autoFocus} value={next} onChange={onNext} />
        <div className="-mt-2 flex gap-1.5" aria-hidden>
          {rules.map((_, i) => (
            <span key={i} className={`h-1.5 flex-1 rounded-full ${i < met ? 'bg-primary' : 'bg-surface-container'}`} />
          ))}
        </div>
        <PasswordField label="Again" autoComplete="new-password" value={again} onChange={onAgain} />
      </div>
      <ul className="mt-5 space-y-2 rounded-3xl bg-surface-container-low p-4">
        {rules.map(([text, ok]) => (
          <li key={text} className={`flex items-center gap-2 text-body-small ${ok ? 'text-primary' : 'text-on-surface-variant'}`}>
            {ok ? <IconDone width={17} height={17} /> : <IconTodo width={17} height={17} />}
            {text}
          </li>
        ))}
      </ul>
    </>
  )
}
