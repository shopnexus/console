import { useQueryClient } from '@tanstack/react-query'
import { createContext, use } from 'react'
import type { Me } from './api'

export const MeContext = createContext<Me | null>(null)

/** The signed-in member; only inside RequireSession. */
export function useMe(): Me {
  const me = use(MeContext)
  if (!me) throw new Error('useMe outside RequireSession')
  return me
}

export const meKey = ['staff', 'me'] as const

/** Forgets the member after sign-out, so the next page asks again. */
export function useForgetMe() {
  const client = useQueryClient()
  return () => client.removeQueries({ queryKey: meKey })
}

/** A path on this console, or "/" for anything else. */
export function safeRedirect(rd: string | null): string {
  if (!rd || !rd.startsWith('/') || rd.startsWith('//') || rd.includes('\\')) return '/'
  return rd
}
