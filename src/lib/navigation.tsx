import { useCallback, useState } from 'react'
import type { ReactNode } from 'react'
import IconAgent from '~icons/material-symbols/auto-awesome-outline-rounded'
import IconAccounts from '~icons/material-symbols-light/group-outline-rounded'
import IconHome from '~icons/material-symbols-light/home-outline-rounded'
import IconReports from '~icons/material-symbols-light/flag-outline-rounded'
import IconSupport from '~icons/material-symbols-light/support-agent-outline'

export interface NavItem {
  to: string
  label: string
  icon: ReactNode
  /** No screen yet: shown greyed with "Sắp có", not followed. */
  soon?: boolean
}

/**
 * The work areas. Báo cáo waits for the report cases (Phase 3) and Tài khoản
 * for its page. Nhật ký thao tác and Nhân viên join, for admins, once they
 * have pages; Trang chủ shows both meanwhile.
 */
export const navigation: NavItem[] = [
  { to: '/', label: 'Trang chủ', icon: <IconHome width={18} height={18} /> },
  { to: '/support', label: 'Hỗ trợ', icon: <IconSupport width={18} height={18} /> },
  { to: '/reports', label: 'Báo cáo', icon: <IconReports width={18} height={18} />, soon: true },
  { to: '/agent', label: 'Agent', icon: <IconAgent width={18} height={18} /> },
  { to: '/accounts', label: 'Tài khoản', icon: <IconAccounts width={18} height={18} />, soon: true },
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
