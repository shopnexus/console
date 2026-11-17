import type { ReactNode } from 'react'
import IconArgo from '~icons/material-symbols-light/deployed-code-outline-rounded'
import IconDb from '~icons/material-symbols-light/database-outline'
import IconFolder from '~icons/material-symbols-light/folder-open-outline-rounded'
import IconGrafana from '~icons/material-symbols-light/monitoring'
import IconLlm from '~icons/material-symbols-light/neurology-outline-rounded'
import IconRestate from '~icons/material-symbols-light/account-tree-outline-rounded'
import type { Role } from './api'

export type DashboardApp = 'grafana' | 'restate' | 'litellm' | 's3' | 'db' | 'argocd'

export interface Dashboard {
  app: DashboardApp
  name: string
  floor: Role
  icon: ReactNode
}

/** The ops dashboards and the lowest role that opens each, as the server's floors. */
export const dashboards: Dashboard[] = [
  { app: 'grafana', name: 'Grafana', floor: 'moderator', icon: <IconGrafana width={18} height={18} /> },
  { app: 'restate', name: 'Restate', floor: 'admin', icon: <IconRestate width={18} height={18} /> },
  { app: 'litellm', name: 'LiteLLM', floor: 'admin', icon: <IconLlm width={18} height={18} /> },
  { app: 's3', name: 'RustFS', floor: 'admin', icon: <IconFolder width={18} height={18} /> },
  { app: 'db', name: 'pgweb', floor: 'admin', icon: <IconDb width={18} height={18} /> },
  { app: 'argocd', name: 'Argo CD', floor: 'admin', icon: <IconArgo width={18} height={18} /> },
]

export function mayOpen(role: Role, d: Dashboard): boolean {
  return role === 'admin' || d.floor === 'moderator'
}
