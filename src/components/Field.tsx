import { type InputHTMLAttributes, type ReactNode, useId } from 'react'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> & {
  label: string
  icon?: ReactNode
  trailing?: ReactNode
  error?: boolean
}

/** A text field with its label above: 48 px, 14 px corners, an icon at the start. */
export function Field({ label, icon, trailing, error, ...input }: Props) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-label-medium">
        {label}
      </label>
      <div
        className={`flex h-12 items-center gap-2.5 rounded-2xl border bg-surface-container-lowest px-4 text-on-surface-variant focus-within:ring-4 ${
          error ? 'border-error focus-within:ring-error/10' : 'border-hairline focus-within:border-primary/60 focus-within:ring-primary/10'
        }`}
      >
        {icon}
        <input id={id} className="h-full min-w-0 flex-1 bg-transparent text-body-medium text-on-surface outline-none" {...input} />
        {trailing}
      </div>
    </div>
  )
}
