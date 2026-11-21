import { useQueryClient } from '@tanstack/react-query'
import { type FormEvent, type ReactNode, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import IconArrow from '~icons/material-symbols/arrow-forward-rounded'
import IconKey from '~icons/material-symbols-light/key-outline-rounded'
import IconDone from '~icons/material-symbols/check-circle-rounded'
import IconMail from '~icons/material-symbols-light/mail-outline-rounded'
import IconCopy from '~icons/material-symbols/content-copy-outline-rounded'
import { CodeInput } from '../components/CodeInput'
import { Field } from '../components/Field'
import { NewPassword, PasswordField } from '../components/NewPassword'
import { passwordRules } from '../lib/password'
import { QrCode } from '../components/QrCode'
import { Button, Notice, Steps, ThemeSwitch } from '../components/ui'
import { ApiError, type Me, post } from '../lib/api'
import { meKey, safeRedirect } from '../lib/session'

type Step = 'password' | 'code' | 'new-password' | 'enroll'

type Enrollment = { secret: string; otpauth_uri: string }

/**
 * Sign-in: email and password, then the TOTP code. The first sign-in replaces
 * the temporary password and enrols TOTP before the code. Every call sends
 * the email and the password again; the server answers which step is next.
 */
export function SignIn() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const client = useQueryClient()
  const [step, setStep] = useState<Step>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [next, setNext] = useState('')
  const [again, setAgain] = useState('')
  const [code, setCode] = useState('')
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // pw is the password the server knows now: the temporary one until the
  // new one is accepted.
  async function login(body: { password: string; new_password?: string; code?: string }) {
    setBusy(true)
    setError(null)
    try {
      const me = await post<Me>('/console/login', { email, ...body })
      client.setQueryData(meKey, me)
      navigate(safeRedirect(params.get('rd')), { replace: true })
    } catch (e) {
      if (!(e instanceof ApiError)) throw e
      switch (e.code) {
        case 'password_change_required':
          setStep('new-password')
          break
        case 'totp_required':
          if (body.new_password) setPassword(body.new_password)
          setStep('code')
          break
        case 'totp_enrollment_required': {
          const pw = body.new_password ?? body.password
          setPassword(pw)
          setEnrollment(await post<Enrollment>('/console/login/totp-enrollment', { email, password: pw }))
          setStep('enroll')
          break
        }
        case 'login_locked':
          setError('Locked for 15 minutes after too many failed sign-ins.')
          break
        case 'invalid_totp_code':
          setCode('')
          setError('The code is wrong.')
          break
        case 'password_too_weak':
          setError('The password does not meet the rules below.')
          break
        default:
          setError(e.status === 401 ? 'Sign-in refused.' : 'Something went wrong. Try again later.')
      }
    } finally {
      setBusy(false)
    }
  }

  const submit = (e: FormEvent, run: () => void) => {
    e.preventDefault()
    if (!busy) run()
  }

  let form: ReactNode
  if (step === 'password') {
    form = (
      <form onSubmit={(e) => submit(e, () => login({ password }))}>
        <img src="/mascot-shield.webp" alt="" className="mx-auto -mt-20 h-[120px] w-[120px] animate-[sn-float_4s_ease-in-out_infinite] object-contain drop-shadow-[0_10px_20px_rgb(0_0_0/0.12)]" />
        <h1 className="mt-2 text-center text-display-small">Sign in</h1>
        {params.get('changed') && !error && (
          <p role="status" className="mt-4 rounded-2xl bg-primary/8 px-3.5 py-2.5 text-center text-body-medium text-primary">
            Password changed. Sign in with the new one.
          </p>
        )}
        <div className="mt-7 space-y-4">
          <Field label="Email" type="email" autoComplete="username" autoFocus icon={<IconMail width={18} height={18} />} value={email} onChange={(e) => setEmail(e.target.value)} required />
          <PasswordField label="Password" autoComplete="current-password" value={password} onChange={setPassword} />
        </div>
        {error && <div className="mt-5"><Notice>{error}</Notice></div>}
        <Button type="submit" full className="mt-6" disabled={busy} icon={<IconArrow width={18} height={18} />}>
          Continue
        </Button>
        <p className="mt-4 text-center text-body-small text-on-surface-variant">Forgot your password? Ask an admin.</p>
      </form>
    )
  } else if (step === 'code') {
    form = (
      <form onSubmit={(e) => submit(e, () => login({ password, code }))}>
        <EmailLine email={email} onChange={() => { setStep('password'); setCode(''); setError(null) }} />
        <h1 className="mt-5 text-display-small">Verification code</h1>
        <div className="mt-7">
          <CodeInput label="Verification code" autoFocus value={code} onChange={setCode} error={!!error} onComplete={(c) => login({ password, code: c })} />
        </div>
        {error && <div className="mt-5"><Notice>{error}</Notice></div>}
        <Button type="submit" full className="mt-6" disabled={busy || code.length !== 6}>Sign in</Button>
      </form>
    )
  } else if (step === 'new-password') {
    const rules = passwordRules(next, again, email, password, 'Not the temporary password')
    form = (
      <form onSubmit={(e) => submit(e, () => login({ password, new_password: next }))}>
        <div className="mb-6"><Steps active={1} /></div>
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-3xl bg-primary/8 text-primary">
            <IconKey width={24} height={24} />
          </span>
          <div className="min-w-0">
            <h1 className="text-headline-medium">Set a new password</h1>
            <p className="truncate text-body-small text-on-surface-variant">
              {email} ·{' '}
              <button type="button" onClick={() => { setStep('password'); setError(null) }} className="font-medium text-primary">
                Change
              </button>
            </p>
          </div>
        </div>
        <div className="mt-7">
          <NewPassword rules={rules} next={next} again={again} onNext={setNext} onAgain={setAgain} autoFocus />
        </div>
        {error && <div className="mt-5"><Notice>{error}</Notice></div>}
        <Button type="submit" full className="mt-6" disabled={busy || !rules.every(([, ok]) => ok)}>
          Save and continue
        </Button>
      </form>
    )
  } else {
    form = (
      <form onSubmit={(e) => submit(e, () => login({ password, code }))}>
        <div className="mb-6"><Steps active={2} /></div>
        <h1 className="text-headline-medium">Two-step sign-in</h1>
        {enrollment && <EnrollCard email={email} enrollment={enrollment} />}
        <p className="mt-5 text-title-small">Code from the app</p>
        <div className="mt-3">
          <CodeInput label="Code from the app" value={code} onChange={setCode} error={!!error} />
        </div>
        {error && <div className="mt-5"><Notice>{error}</Notice></div>}
        <Button type="submit" full className="mt-6" disabled={busy || code.length !== 6}>Turn on</Button>
      </form>
    )
  }

  return (
    <main className="band relative flex min-h-dvh items-center justify-center overflow-hidden bg-surface-container-lowest px-6 py-24 text-on-surface">
      <div aria-hidden className="dots pointer-events-none absolute inset-0" />
      <div className="absolute left-8 top-7 flex items-center gap-2">
        <img src="/favicon.svg" alt="ShopNexus" className="h-8 w-8 rounded-[9px]" />
        <span className="text-title-medium">ShopNexus Console</span>
      </div>
      <div className="absolute right-8 top-7">
        <ThemeSwitch round />
      </div>
      <div key={step} className="relative w-full max-w-[440px] animate-pane rounded-5xl border border-hairline bg-surface-container-lowest p-9 shadow-soft">
        {form}
      </div>
      <p className="absolute bottom-6 text-body-small text-on-surface-variant">{location.host}</p>
    </main>
  )
}

function EmailLine({ email, onChange }: { email: string; onChange: () => void }) {
  return (
    <p className="text-body-small text-on-surface-variant">
      {email} ·{' '}
      <button type="button" onClick={onChange} className="font-medium text-primary">
        Change
      </button>
    </p>
  )
}

function EnrollCard({ email, enrollment }: { email: string; enrollment: Enrollment }) {
  const [copied, setCopied] = useState(false)
  const grouped = enrollment.secret.match(/.{1,4}/g)?.join(' ') ?? enrollment.secret
  return (
    <div className="mt-5 rounded-3xl border border-hairline bg-surface-container-lowest p-5">
      <div className="flex justify-center">
        <div className="rounded-lg bg-white p-2.5">
          <QrCode value={enrollment.otpauth_uri} size={156} />
        </div>
      </div>
      <div className="mt-4 border-t border-hairline pt-3">
        <div className="flex items-center gap-2 rounded-sm bg-surface-container py-1.5 pl-3 pr-1">
          <span className="flex-1 break-all tabular-nums text-body-large tracking-wide">{grouped}</span>
          <button
            type="button"
            title={copied ? 'Copied' : 'Copy the key'}
            onClick={() => navigator.clipboard.writeText(enrollment.secret).then(() => setCopied(true))}
            className="state-layer flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant"
          >
            {copied ? <IconDone width={18} height={18} className="text-primary" /> : <IconCopy width={18} height={18} />}
          </button>
        </div>
        <p className="mt-2 text-body-small text-on-surface-variant">{email}</p>
      </div>
    </div>
  )
}
