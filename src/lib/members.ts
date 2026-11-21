import { useQuery } from '@tanstack/react-query'
import { api, type Member, type Page } from './api'
import { time, when } from './format'

const membersQuery = { queryKey: ['console', 'members', 'all'], queryFn: () => api<Page<Member>>('/console/members?limit=100') }

/** Members, newest first. */
export function useMembers() {
  return useQuery(membersQuery)
}

/**
 * How a member signs in now: disabled, locked by wrong tries, never signed in,
 * reset (a temporary password or no two-step yet), or fine.
 */
export type SignIn = 'disabled' | 'locked' | 'never' | 'reset' | 'ok'

export function signInOf(m: Member, now = Date.now()): SignIn {
  if (m.status === 'disabled') return 'disabled'
  if (m.locked_until && new Date(m.locked_until).getTime() > now) return 'locked'
  if (!m.last_sign_in_at) return 'never'
  if (m.must_change_password || !m.totp_enrolled) return 'reset'
  return 'ok'
}

/** What a sign-in state reads as; ok reads as two-step on. */
export function signInText(m: Member, s: SignIn = signInOf(m)): string {
  switch (s) {
    case 'disabled':
      return 'Disabled'
    case 'locked':
      return `Locked until ${time(m.locked_until!)}`
    case 'never':
      return 'First sign-in pending'
    case 'reset':
      return m.must_change_password ? 'Temporary password' : 'Two-step not set up'
    case 'ok':
      return 'Two-step on'
  }
}

/** When the member last signed in, or "Never". */
export const lastSignIn = (m: Member) => (m.last_sign_in_at ? when(m.last_sign_in_at) : 'Never')

/** An active member whose sign-in waits on something: locked, never signed in, or reset. */
export const needsAttention = (m: Member, now = Date.now()) => !['ok', 'disabled'].includes(signInOf(m, now))

/** Members whose sign-in needs an admin. */
export function useMembersToSee(enabled: boolean) {
  return useQuery({ ...membersQuery, enabled, select: (p) => p.items.filter((m) => needsAttention(m)) })
}
