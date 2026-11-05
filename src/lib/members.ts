import { useQuery } from '@tanstack/react-query'
import { api, type Member, type Page } from './api'

/** Members whose sign-in needs an admin: locked, or without TOTP. */
export function useMembersToSee(enabled: boolean) {
  return useQuery({
    queryKey: ['staff', 'members', 'to-see'],
    queryFn: () => api<Page<Member>>('/staff/members?limit=100'),
    enabled,
    select: (p) =>
      p.items.filter(
        (m) => m.status === 'active' && ((m.locked_until && new Date(m.locked_until) > new Date()) || !m.totp_enrolled),
      ),
  })
}
