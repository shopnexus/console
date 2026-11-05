import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { ApiError, api, type Me } from '../lib/api'
import { MeContext, meKey } from '../lib/session'

/**
 * Renders children for a signed-in member and sends anyone else to sign-in,
 * keeping the page they were on in rd.
 */
export function RequireSession({ children }: { children: ReactNode }) {
  const location = useLocation()
  const me = useQuery({
    queryKey: meKey,
    queryFn: () => api<Me>('/staff/me'),
    retry: false,
    staleTime: 60_000,
  })
  if (me.isPending) return null
  if (me.error) {
    if (me.error instanceof ApiError && me.error.status === 401) {
      const rd = location.pathname + location.search
      return <Navigate to={`/signin?rd=${encodeURIComponent(rd)}`} replace />
    }
    throw me.error
  }
  return <MeContext value={me.data}>{children}</MeContext>
}
