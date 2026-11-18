import { useCallback, useState } from 'react'
import type { ReactNode } from 'react'
import IconAccounts from '~icons/material-symbols-light/group-outline-rounded'
import IconReports from '~icons/material-symbols-light/flag-outline-rounded'
import IconSupport from '~icons/material-symbols-light/support-agent-outline'

export interface NavItem {
  to: string
  label: string
  icon: ReactNode
}

/** The work areas under New chat and Search. New chat is the home page, so there is no Home row. */
export const navigation: NavItem[] = [
  { to: '/support', label: 'Support', icon: <IconSupport width={19} height={19} /> },
  { to: '/reports', label: 'Reports', icon: <IconReports width={19} height={19} /> },
  { to: '/accounts', label: 'Accounts', icon: <IconAccounts width={19} height={19} /> },
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
 * Whether the sidebar shows as a rail. The member's choice is kept in this
 * browser. A page with panes of its own (Support, a chat with a side panel)
 * passes auto, which starts the rail collapsed; expanding it there lasts
 * until the page is left and leaves the saved choice alone.
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
