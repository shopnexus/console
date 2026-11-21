import type { ReactNode } from 'react'
import { type Action, shortId } from '../lib/api'
import { kindName } from '../lib/sources'
import IconCheck from '~icons/material-symbols-light/check-rounded'
import IconEdit from '~icons/material-symbols-light/edit-outline-rounded'
import IconFlag from '~icons/material-symbols-light/flag-outline-rounded'
import IconHide from '~icons/material-symbols-light/visibility-off-outline'
import IconKey from '~icons/material-symbols-light/key-outline-rounded'
import IconLock from '~icons/material-symbols-light/lock-outline'
import IconPerson from '~icons/material-symbols-light/person-add-outline-rounded'
import IconPersonOff from '~icons/material-symbols-light/person-off-outline-rounded'
import IconShow from '~icons/material-symbols-light/visibility-outline'
import IconTune from '~icons/material-symbols-light/tune-rounded'
import IconUnlock from '~icons/material-symbols-light/lock-open-outline-rounded'

export type Look = [string, ReactNode, string]

// What each action reads as in the log: the verb, its icon and its tint.
const looks: Record<string, Look> = {
  'account.suspend': ['suspended', <IconLock key="a" width={17} height={17} />, 'bg-surface-container text-on-surface-variant'],
  'account.unsuspend': ['lifted the suspension of', <IconUnlock key="b" width={17} height={17} />, 'bg-primary/8 text-primary'],
  'member.create': ['added', <IconPerson key="c" width={17} height={17} />, 'bg-secondary-container text-on-secondary-container'],
  'member.disable': ['disabled', <IconPersonOff key="d" width={17} height={17} />, 'bg-surface-container text-on-surface-variant'],
  'member.enable': ['enabled', <IconPerson key="e" width={17} height={17} />, 'bg-secondary-container text-on-secondary-container'],
  'member.reset_password': ['reset the password of', <IconKey key="f" width={17} height={17} />, 'bg-surface-container text-on-surface-variant'],
  'member.reset_totp': ['reset two-step sign-in of', <IconKey key="g" width={17} height={17} />, 'bg-surface-container text-on-surface-variant'],
  'member.unlock': ['unlocked sign-in of', <IconKey key="h" width={17} height={17} />, 'bg-surface-container text-on-surface-variant'],
  'member.rename': ['renamed', <IconEdit key="n" width={17} height={17} />, 'bg-surface-container text-on-surface-variant'],
  'report.dismiss': ['found no violation by', <IconCheck key="i" width={17} height={17} />, 'bg-surface-container text-on-surface-variant'],
  'report.resolve': ['resolved the case of', <IconFlag key="j" width={17} height={17} />, 'bg-primary/8 text-primary'],
  'report.reopen': ['reopened the case of', <IconFlag key="k" width={17} height={17} />, 'bg-surface-container text-on-surface-variant'],
  'listing.hide': ['hid listing', <IconHide key="l" width={17} height={17} />, 'bg-surface-container text-on-surface-variant'],
  'listing.unhide': ['restored listing', <IconShow key="m" width={17} height={17} />, 'bg-primary/8 text-primary'],
}

/** A settings change or anything the console does not name yet: "settings.agent.update" reads "changed settings · agent update". */
export function lookOf(kind: string): Look {
  return looks[kind] ?? [`changed ${kind.replace(/^settings\./, 'settings · ').replace(/[._]/g, ' ')}`, <IconTune key="x" width={17} height={17} />, 'bg-secondary-container text-on-secondary-container']
}

export const groupOf = (kind: string) =>
  kind.startsWith('account.') ? 'Suspensions' : kind.startsWith('listing.') ? 'Hidden listings' : kind.startsWith('report.') ? 'Report cases' : kind.startsWith('member.') ? 'Members' : 'Settings'

/** What an action was done to: a member by name, anything else as "Account 7b1c22e0". */
export const targetLabel = (a: Action) => a.target.name || `${kindName(a.target.kind)} ${shortId(a.target.id)}`
