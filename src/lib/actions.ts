import type { Action } from './api'
import { usePaged } from './paged'

/** The audit log: every console action newest first, or one member's. */
export const useActions = (member: string) => usePaged<Action>(['console', 'actions', 'log', member], '/console/actions', { member_id: member })
