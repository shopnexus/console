import { useQueryClient } from '@tanstack/react-query'
import { type FormEvent, type ReactNode, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import IconArrow from '~icons/material-symbols/arrow-forward-rounded'
import IconCopy from '~icons/material-symbols/content-copy-outline-rounded'
import IconDone from '~icons/material-symbols/check-circle-rounded'
import IconTodo from '~icons/material-symbols/radio-button-unchecked'
import IconHidden from '~icons/material-symbols/visibility-off-outline-rounded'
import IconShown from '~icons/material-symbols/visibility-outline-rounded'
import { CodeInput } from '../components/CodeInput'
import { Field } from '../components/Field'
import { QrCode } from '../components/QrCode'
import { Button, Notice, Shape, Steps, ThemeSwitch } from '../components/ui'
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
      const me = await post<Me>('/staff/login', { email, ...body })
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
          setEnrollment(await post<Enrollment>('/staff/login/totp-enrollment', { email, password: pw }))
          setStep('enroll')
          break
        }
        case 'login_locked':
          setError('Tạm khoá 15 phút sau nhiều lần đăng nhập sai.')
          break
        case 'invalid_totp_code':
          setCode('')
          setError('Mã không đúng.')
          break
        case 'password_too_weak':
          setError('Mật khẩu chưa đạt các điều kiện bên dưới.')
          break
        default:
          setError(e.status === 401 ? 'Đăng nhập không thành công.' : 'Có lỗi, thử lại sau.')
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
        <h1 className="text-headline-medium">Đăng nhập</h1>
        <div className="mt-8 space-y-6">
          <Field label="Email" type="email" autoComplete="username" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} required />
          <PasswordField label="Mật khẩu" autoComplete="current-password" value={password} onChange={setPassword} />
        </div>
        {error && <div className="mt-6"><Notice>{error}</Notice></div>}
        <Button type="submit" full className="mt-8" disabled={busy} icon={<IconArrow width={20} height={20} />}>
          Tiếp tục
        </Button>
      </form>
    )
  } else if (step === 'code') {
    form = (
      <form onSubmit={(e) => submit(e, () => login({ password, code }))}>
        <EmailChip email={email} onChange={() => { setStep('password'); setCode(''); setError(null) }} />
        <h1 className="mt-6 text-headline-medium">Mã xác thực</h1>
        <div className="mt-8">
          <CodeInput label="Mã xác thực" autoFocus value={code} onChange={setCode} error={!!error} onComplete={(c) => login({ password, code: c })} />
        </div>
        {error && <div className="mt-6"><Notice>{error}</Notice></div>}
        <Button type="submit" full className="mt-8" disabled={busy || code.length !== 6}>Đăng nhập</Button>
      </form>
    )
  } else if (step === 'new-password') {
    const rules: [string, boolean][] = [
      ['12–128 ký tự', next.length >= 12 && next.length <= 128],
      ['Khác email', next !== '' && next.toLowerCase() !== email.trim().toLowerCase()],
      ['Khác mật khẩu tạm', next !== '' && next !== password],
      ['Hai ô khớp nhau', next !== '' && next === again],
    ]
    form = (
      <form onSubmit={(e) => submit(e, () => login({ password, new_password: next }))}>
        <div className="mb-8"><Steps active={1} /></div>
        <h1 className="text-headline-medium">Mật khẩu mới</h1>
        <div className="mt-8 space-y-6">
          <PasswordField label="Mật khẩu mới" autoComplete="new-password" autoFocus value={next} onChange={setNext} />
          <PasswordField label="Nhập lại mật khẩu mới" autoComplete="new-password" value={again} onChange={setAgain} />
        </div>
        <ul className="mt-6 space-y-2">
          {rules.map(([text, ok]) => (
            <li key={text} className={`flex items-center gap-2 text-body-medium ${ok ? 'text-on-surface' : 'text-on-surface-variant'}`}>
              {ok ? <IconDone width={20} height={20} className="text-primary" /> : <IconTodo width={20} height={20} className="text-outline" />}
              {text}
            </li>
          ))}
        </ul>
        {error && <div className="mt-6"><Notice>{error}</Notice></div>}
        <Button type="submit" full className="mt-8" disabled={busy || !rules.every(([, ok]) => ok)} icon={<IconArrow width={20} height={20} />}>
          Tiếp tục
        </Button>
      </form>
    )
  } else {
    form = (
      <form onSubmit={(e) => submit(e, () => login({ password, code }))}>
        <div className="mb-6"><Steps active={2} /></div>
        <h1 className="text-headline-medium">Xác thực hai bước</h1>
        {enrollment && <EnrollCard email={email} enrollment={enrollment} />}
        <p className="mt-5 text-title-small">Mã từ ứng dụng</p>
        <div className="mt-3">
          <CodeInput label="Mã từ ứng dụng" value={code} onChange={setCode} error={!!error} />
        </div>
        {error && <div className="mt-6"><Notice>{error}</Notice></div>}
        <Button type="submit" full className="mt-6" disabled={busy || code.length !== 6}>Bật</Button>
      </form>
    )
  }

  return (
    <div className="flex min-h-dvh bg-surface text-on-surface">
      <BrandPanel />
      <main className="flex flex-1 flex-col px-6 py-8 lg:px-16 lg:py-10">
        <div className="flex justify-end"><ThemeSwitch /></div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[400px]">{form}</div>
        </div>
      </main>
    </div>
  )
}

/** The start half: the mark, the mascot and the name, from expanded up. */
function BrandPanel() {
  return (
    <aside className="relative hidden w-[40%] max-w-[576px] shrink-0 flex-col overflow-hidden rounded-r-xl-plus bg-primary-container px-14 py-12 lg:flex">
      <Shape name="Cookie9Sided" size={520} className="absolute -right-40 top-28 text-inverse-primary opacity-[.16]" />
      <Shape name="Clover4Leaf" size={120} className="absolute right-16 top-12 text-on-primary-container opacity-30" />
      <Shape name="Sunny" size={76} className="absolute left-[300px] top-[300px] text-tertiary-fixed opacity-50" />
      <Shape name="Flower" size={150} className="absolute -left-12 bottom-24 text-primary opacity-60" />
      <img src="/favicon.svg" alt="ShopNexus" className="relative h-10 w-10 rounded-md ring-2 ring-on-primary-container/40" />
      <div className="relative mb-10 mt-auto">
        <img src="/mascot-shield.webp" alt="" className="-ml-4 mb-4 h-72 w-72 drop-shadow-[0_12px_24px_rgb(0_0_0/0.18)]" />
        <h2 className="text-display-medium text-white">ShopNexus Console</h2>
      </div>
    </aside>
  )
}

function PasswordField(props: {
  label: string
  value: string
  onChange: (v: string) => void
  autoComplete: string
  autoFocus?: boolean
}) {
  const [shown, setShown] = useState(false)
  return (
    <Field
      label={props.label}
      type={shown ? 'text' : 'password'}
      autoComplete={props.autoComplete}
      autoFocus={props.autoFocus}
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      required
      trailing={
        <button
          type="button"
          title={shown ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          onClick={() => setShown(!shown)}
          className="state-layer flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant"
        >
          {shown ? <IconHidden width={22} height={22} /> : <IconShown width={22} height={22} />}
        </button>
      }
    />
  )
}

function EmailChip({ email, onChange }: { email: string; onChange: () => void }) {
  return (
    <div className="inline-flex h-10 items-center gap-2 rounded-full border border-outline-variant bg-surface-container-lowest pl-1 pr-1">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary-container text-title-small uppercase text-on-secondary-container">
        {email.trim()[0] ?? ''}
      </span>
      <span className="text-body-medium">{email}</span>
      <button type="button" onClick={onChange} className="state-layer rounded-full px-2 py-1 text-label-large text-primary">
        Đổi
      </button>
    </div>
  )
}

function EnrollCard({ email, enrollment }: { email: string; enrollment: Enrollment }) {
  const [copied, setCopied] = useState(false)
  const grouped = enrollment.secret.match(/.{1,4}/g)?.join(' ') ?? enrollment.secret
  return (
    <div className="mt-5 rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
      <div className="flex justify-center">
        <div className="rounded-lg bg-white p-2.5">
          <QrCode value={enrollment.otpauth_uri} size={156} />
        </div>
      </div>
      <div className="mt-4 border-t border-outline-variant pt-3">
        <div className="flex items-center gap-2 rounded-sm bg-surface-container py-1.5 pl-3 pr-1">
          <span className="flex-1 break-all font-mono text-body-large tracking-wide">{grouped}</span>
          <button
            type="button"
            title={copied ? 'Đã chép' : 'Chép khoá'}
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
