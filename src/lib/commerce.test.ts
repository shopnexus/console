import { describe, expect, it } from 'vitest'
import { askHref, humanize } from './commerce'

describe('commerce', () => {
  it('asks the agent about a record with it attached', () => {
    expect(askHref('order', 'o1', 'Order SN-1042')).toBe('/?attach=order%3Ao1&label=Order+SN-1042')
  })
  it('reads a status the console has no word for', () => {
    expect(humanize('out_for_delivery')).toBe('Out for delivery')
  })
})
