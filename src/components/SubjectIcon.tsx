import type { ReactNode } from 'react'
import IconAccount from '~icons/material-symbols-light/person-outline-rounded'
import IconOwn from '~icons/material-symbols-light/chat-outline-rounded'
import IconTicket from '~icons/material-symbols-light/package-2-outline'
import type { SubjectKind } from '../lib/agent'

/** The icon of the record a chat is about; a chat without one shows a speech bubble. */
export function SubjectIcon({ kind, size = 16 }: { kind?: SubjectKind; size?: number }): ReactNode {
  if (kind === 'ticket') return <IconTicket width={size} height={size} />
  if (kind === 'account') return <IconAccount width={size} height={size} />
  return <IconOwn width={size} height={size} />
}
