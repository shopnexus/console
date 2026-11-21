import type { Action } from './api'
import { usePaged } from './paged'

/** The audit log: every console action newest first, or one member's, or those on one record. */
export const useActions = (member: string, target = '') =>
  usePaged<Action>(['console', 'actions', 'log', member, target], '/console/actions', { member_id: member, target_id: target })
