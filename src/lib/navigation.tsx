import { useCallback, useState } from 'react'
import type { ReactNode } from 'react'
import IconActions from '~icons/material-symbols/history-rounded'
import IconAccounts from '~icons/material-symbols/group-outline-rounded'
import IconHome from '~icons/material-symbols/home-rounded'
import IconMembers from '~icons/material-symbols/badge-outline-rounded'
import IconReports from '~icons/material-symbols/flag-outline-rounded'
import IconSupport from '~icons/material-symbols/support-agent-rounded'

export interface NavItem {
  to: string
  label: string
  icon: ReactNode
  adminOnly?: boolean
  /** No screen yet: shown, not followed. */
  soon?: boolean
}

/** The work areas. The audit log and the members are admins' (GET /v1/console/actions and /members); Hỗ trợ is everyone's. */
export const navigation: NavItem[] = [
  { to: '/', label: 'Trang chủ', icon: <IconHome width={20} height={20} /> },
  { to: '/support', label: 'Hỗ trợ', icon: <IconSupport width={20} height={20} /> },
  { to: '/accounts', label: 'Tài khoản', icon: <IconAccounts width={20} height={20} />, soon: true },
  { to: '/actions', label: 'Nhật ký thao tác', icon: <IconActions width={20} height={20} />, adminOnly: true, soon: true },
  { to: '/members', label: 'Nhân viên', icon: <IconMembers width={20} height={20} />, adminOnly: true, soon: true },
  { to: '/reports', label: 'Báo cáo', icon: <IconReports width={20} height={20} />, soon: true },
]

const collapsedKey = 'console-nav-collapsed'

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(collapsedKey) === '1'
  } catch {
    return false
  }
}

/**
 * Whether the drawer shows as a rail. The member's choice is kept in this
 * browser. A page with panes of its own (Hỗ trợ) passes auto, which starts
 * the rail collapsed; expanding it there lasts until the page is left and
 * leaves the saved choice alone.
 */
export function useNavCollapsed(auto: boolean): [boolean, () => void] {
  const [saved, setSaved] = useState(readCollapsed)
  const [peek, setPeek] = useState(false)
  const toggle = useCallback(() => {
    if (auto) {
      setPeek((p) => !p)
      return
    }
    setSaved((c) => {
      try {
        if (c) localStorage.removeItem(collapsedKey)
        else localStorage.setItem(collapsedKey, '1')
      } catch {
        // Without storage the choice lasts the page.
      }
      return !c
    })
  }, [auto])
  return [auto ? !peek : saved, toggle]
}
