import type { ReactNode } from 'react'
import IconArgo from '~icons/material-symbols/deployed-code-outline-rounded'
import IconFolder from '~icons/material-symbols/folder-open-outline-rounded'
import IconGrafana from '~icons/material-symbols/monitoring-rounded'
import IconLlm from '~icons/material-symbols/neurology-outline-rounded'
import IconRestate from '~icons/material-symbols/account-tree-outline-rounded'
import type { Role } from './api'

export type DashboardApp = 'grafana' | 'restate' | 'litellm' | 's3' | 'argocd'

export interface Dashboard {
  app: DashboardApp
  name: string
  floor: Role
  icon: ReactNode
}

/** The ops dashboards and the lowest role that opens each, as the server's floors. */
export const dashboards: Dashboard[] = [
  { app: 'grafana', name: 'Grafana', floor: 'moderator', icon: <IconGrafana width={20} height={20} /> },
  { app: 'restate', name: 'Restate', floor: 'admin', icon: <IconRestate width={20} height={20} /> },
  { app: 'litellm', name: 'LiteLLM', floor: 'admin', icon: <IconLlm width={20} height={20} /> },
  { app: 's3', name: 'RustFS', floor: 'admin', icon: <IconFolder width={20} height={20} /> },
  { app: 'argocd', name: 'Argo CD', floor: 'admin', icon: <IconArgo width={20} height={20} /> },
]

export function mayOpen(role: Role, d: Dashboard): boolean {
  return role === 'admin' || d.floor === 'moderator'
}
