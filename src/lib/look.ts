// A record's initial takes one of four tints from the brand roles, picked
// from its id, so an account keeps its colour on every screen. Red stays
// for `error`; members' initials are filled `primary`.
const tints = [
  'bg-primary/10 text-primary',
  'bg-secondary-container text-on-secondary-container',
  'bg-tertiary-fixed text-on-tertiary-fixed-variant',
  'bg-inverse-primary/40 text-primary-container',
]

export function tintOf(id: string): string {
  let sum = 0
  for (const c of id) sum += c.charCodeAt(0)
  return tints[sum % tints.length]
}

/** A list row's look: the picked row is a white card with a faint `primary` ring. */
export function pickedRow(on: boolean): string {
  return on ? 'relative bg-surface-container-lowest shadow-soft ring-1 ring-primary/20' : 'relative hover:bg-on-surface/5'
}

/** A segmented control's segment: the picked one is the white thumb, which settles in when picked. */
export function segment(on: boolean): string {
  return on ? 'animate-thumb bg-surface-container-lowest font-medium text-on-surface shadow-soft' : 'text-on-surface-variant hover:text-on-surface'
}
