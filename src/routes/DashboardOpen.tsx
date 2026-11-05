import { useMutation } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import IconLock from '~icons/material-symbols/lock-outline-rounded'
import { Button, Shape } from '../components/ui'
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
    mutationFn: (app: DashboardApp) => post<Ticket>('/staff/dashboard-tickets', { app }),
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

  const forbidden = (d && !allowed) || (ticket.error instanceof ApiError && ticket.error.code === 'staff_forbidden')
  // The ungated case leaves the page in onError; the card keeps showing progress.
  const notConfigured = ticket.error instanceof ApiError && ticket.error.code === 'dashboard_not_configured'
  const failed = ticket.isError && !forbidden && !notConfigured

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-surface text-on-surface">
      <Shape name="Cookie9Sided" size={640} className="absolute -left-56 -top-64 text-secondary-container opacity-60" />
      <Shape name="Clover4Leaf" size={220} className="absolute right-24 top-20 text-surface-container-high" />
      <Shape name="Sunny" size={120} className="absolute bottom-24 left-32 text-tertiary-fixed opacity-70" />
      <header className="relative flex h-16 items-center px-8">
        <Link to="/" className="flex items-center gap-3">
          <img src="/favicon.svg" alt="ShopNexus" className="h-8 w-8 rounded-sm" />
          <span className="text-title-medium">ShopNexus</span>
          <span className="rounded-full bg-secondary-container px-3 py-1 text-label-medium text-on-secondary-container">Console</span>
        </Link>
      </header>
      <main className="relative flex flex-1 items-center justify-center px-6 pb-10">
        <section className="w-full max-w-[600px] rounded-xl-plus bg-surface-container-lowest px-8 py-10 md:px-12 md:py-12">
          <div className="flex items-center gap-4">
            <img src="/favicon.svg" alt="" className="h-16 w-16 rounded-lg-plus" />
            {forbidden || failed ? (
              <div className="flex h-10 flex-1 items-center">
                <div className="h-0 flex-1 border-t-2 border-dashed border-outline-variant" />
                <span className="mx-2 flex h-10 w-10 items-center justify-center rounded-full bg-error-container text-error">
                  <IconLock width={20} height={20} />
                </span>
                <div className="h-0 flex-1 border-t-2 border-dashed border-outline-variant" />
              </div>
            ) : (
              <div className="relative h-2.5 flex-1">
                <div className="absolute inset-x-0 top-1/2 border-t-2 border-dashed border-outline-variant" />
                <span className="absolute top-0 h-2.5 w-2.5 animate-[travel_1.6s_var(--ease-spatial)_infinite] rounded-full bg-primary" />
              </div>
            )}
            <div
              className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-lg-plus [&>svg]:h-8 [&>svg]:w-8 ${
                allowed && !failed ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container-high text-outline'
              }`}
            >
              {d?.icon}
            </div>
          </div>
          {!forbidden && !failed && <p className="mt-10 text-label-large text-primary">Đang mở</p>}
          <h1 className={`${forbidden || failed ? 'mt-10' : 'mt-2'} text-display-small`}>{d?.name ?? 'Không có công cụ này'}</h1>
          {!forbidden && !failed && d && (
            <div className="relative mt-8 h-1 overflow-hidden rounded-full bg-secondary-container">
              <span className="absolute inset-y-0 w-2/5 animate-[bar_1.8s_var(--ease-effects)_infinite] rounded-full bg-primary" />
            </div>
          )}
          {forbidden && (
            <p className="mt-6 inline-flex items-center gap-2 rounded-sm bg-error-container px-3 py-1.5 text-label-large text-error">
              <IconLock width={18} height={18} />
              Cần quyền {roleName.admin}
            </p>
          )}
          {failed && <p className="mt-6 text-body-large text-on-surface-variant">Chưa mở được, thử lại sau.</p>}
          {(forbidden || failed || !d) && (
            <Button className="mt-10" onClick={() => navigate('/')}>
              Về console
            </Button>
          )}
        </section>
      </main>
    </div>
  )
}
