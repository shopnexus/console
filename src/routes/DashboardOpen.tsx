import { useMutation } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import IconLock from '~icons/material-symbols-light/lock-outline'
import IconOpen from '~icons/material-symbols-light/north-east-rounded'
import { Shell } from '../components/Shell'
import { Button } from '../components/ui'
import { ApiError, post, roleName } from '../lib/api'
import { type DashboardApp, dashboards, mayOpen } from '../lib/dashboards'
import { safeRedirect, useMe } from '../lib/session'

type Ticket = { ticket: string; callback_url: string }

/**
 * Hands the member to an ops dashboard: asks the server for a one-time
 * ticket and goes to the dashboard's callback with it. The dashboard's gate
 * sends members here when they have no session on its host. A stack whose
 * server names no dashboard hosts (the local compose stacks) has no gate, so
 * the dashboard opens directly at <app>.<the console's domain>.
 */
export function DashboardOpen() {
  const [params] = useSearchParams()
  const me = useMe()
  const navigate = useNavigate()
  const asked = useRef(false)
  const d = dashboards.find((x) => x.app === params.get('app'))
  const rd = params.get('rd') ?? '/'
  const allowed = d ? mayOpen(me.role, d) : false
  const ticket = useMutation({
    mutationFn: (app: DashboardApp) => post<Ticket>('/console/dashboard-tickets', { app }),
    onSuccess: (t) => {
      const url = new URL(t.callback_url)
      url.searchParams.set('rd', rd)
      window.location.replace(url.toString())
    },
    onError: (e, app) => {
      if (e instanceof ApiError && e.code === 'dashboard_not_configured') {
        const domain = location.host.replace(/^console\./, '')
        window.location.replace(`${location.protocol}//${app}.${domain}${safeRedirect(rd)}`)
      }
    },
  })
  const { mutate } = ticket
  useEffect(() => {
    if (d && allowed && !asked.current) {
      asked.current = true
      mutate(d.app)
    }
  }, [d, allowed, mutate])

  const forbidden = (d && !allowed) || (ticket.error instanceof ApiError && ticket.error.code === 'console_forbidden')
  // The ungated case leaves the page in onError; the card keeps showing progress.
  const notConfigured = ticket.error instanceof ApiError && ticket.error.code === 'dashboard_not_configured'
  const failed = ticket.isError && !forbidden && !notConfigured

  const others = dashboards.filter((x) => x !== d && mayOpen(me.role, x))
  const bad = forbidden || failed || !d
  const host = d ? `${d.app}.${location.host.replace(/^console\./, '')}` : ''

  return (
    <Shell>
      <section className="band relative flex flex-1 items-center justify-center overflow-hidden">
        <div aria-hidden className="dots pointer-events-none absolute inset-0" />
        <div className="relative w-[440px] animate-rise">
          <div className="rounded-5xl border border-hairline bg-surface-container-lowest p-9 text-center shadow-soft">
            <div className="flex items-center justify-center gap-4">
              <img src="/favicon.svg" alt="ShopNexus" className="h-16 w-16 rounded-4xl" />
              <span className="flex gap-1.5" aria-hidden>
                {Array.from({ length: 7 }, (_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 w-1.5 rounded-full ${bad ? 'bg-outline-variant' : 'animate-pulse bg-primary'}`}
                    style={bad ? undefined : { animationDelay: `${i * 120}ms` }}
                  />
                ))}
              </span>
              <span
                className={`flex h-16 w-16 items-center justify-center rounded-4xl [&>svg]:h-[30px] [&>svg]:w-[30px] ${
                  bad ? 'bg-surface-container text-on-surface-variant' : 'bg-primary/8 text-primary'
                }`}
              >
                {bad ? <IconLock /> : d?.icon}
              </span>
            </div>
            <h1 className="mt-6 text-headline-medium">
              {!d ? 'No such tool' : forbidden ? `${roleName.admin}s only` : failed ? `${d.name} did not open` : `Opening ${d.name}`}
            </h1>
            {d && <p className="mt-1.5 text-body-small text-on-surface-variant">{d.name} · {host}</p>}
            {forbidden && d && (
              <p className="mt-5 rounded-2xl bg-surface-container-low px-4 py-3 text-body-small text-on-surface-variant">Ask an admin if you need {d.name}.</p>
            )}
            {!bad && (
              <div className="relative mx-auto mt-6 h-1.5 w-48 overflow-hidden rounded-full bg-surface-container">
                <span className="absolute inset-y-0 w-2/5 animate-[bar_1.8s_var(--ease-effects)_infinite] rounded-full bg-primary" />
              </div>
            )}
            {(failed || !d) && (
              <Button className="mt-6" onClick={() => navigate('/')}>
                Back to the console
              </Button>
            )}
          </div>
          {forbidden && others.length > 0 && (
            <>
              <p className="mb-2 mt-6 text-center text-body-small text-on-surface-variant">You can open</p>
              <div className="grid grid-cols-2 gap-2">
                {others.map((o) => (
                  <a
                    key={o.app}
                    href={`/dashboards/open?app=${o.app}`}
                    className="flex items-center gap-2.5 rounded-2xl border border-hairline bg-surface-container-lowest px-3.5 py-2.5 text-label-medium font-normal shadow-soft"
                  >
                    <span className="text-primary">{o.icon}</span>
                    <span className="flex-1">{o.name}</span>
                    <IconOpen width={15} height={15} className="text-on-surface-variant" />
                  </a>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </Shell>
  )
}
