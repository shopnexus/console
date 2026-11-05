import type { ReactNode } from 'react'
import IconActions from '~icons/material-symbols/history-rounded'
import IconAccounts from '~icons/material-symbols/group-outline-rounded'
import IconHome from '~icons/material-symbols/home-rounded'
import IconMembers from '~icons/material-symbols/badge-outline-rounded'
import IconReports from '~icons/material-symbols/flag-outline-rounded'

export interface NavItem {
  to: string
  label: string
  icon: ReactNode
  adminOnly?: boolean
  /** No screen yet: shown, not followed. */
  soon?: boolean
}

/** The work areas. The audit log and the members are admins' (GET /v1/staff/actions and /members). */
export const navigation: NavItem[] = [
  { to: '/', label: 'Trang chủ', icon: <IconHome width={24} height={24} /> },
  { to: '/accounts', label: 'Tài khoản', icon: <IconAccounts width={24} height={24} />, soon: true },
  { to: '/actions', label: 'Nhật ký thao tác', icon: <IconActions width={24} height={24} />, adminOnly: true, soon: true },
  { to: '/members', label: 'Nhân viên', icon: <IconMembers width={24} height={24} />, adminOnly: true, soon: true },
  { to: '/reports', label: 'Báo cáo', icon: <IconReports width={24} height={24} />, soon: true },
]
