import { useQuery } from '@tanstack/react-query'
import { api, type Member, type Page } from './api'

const membersQuery = { queryKey: ['console', 'members', 'all'], queryFn: () => api<Page<Member>>('/console/members?limit=100') }

/** Members, newest first. */
export function useMembers() {
  return useQuery(membersQuery)
}

/** Members whose sign-in needs an admin: locked, or without TOTP. */
export function useMembersToSee(enabled: boolean) {
  return useQuery({
    ...membersQuery,
    enabled,
    select: (p) =>
      p.items.filter(
        (m) => m.status === 'active' && ((m.locked_until && new Date(m.locked_until) > new Date()) || !m.totp_enrolled),
      ),
  })
}
