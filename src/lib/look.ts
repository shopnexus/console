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

/** A list row's look: the picked row is `primary` at 6 % with a bar at the start (PickedBar). */
export function pickedRow(on: boolean): string {
  return on ? 'relative bg-primary/6' : 'relative hover:bg-surface-container-low'
}
