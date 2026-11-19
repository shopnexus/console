import { describe, expect, it } from 'vitest'
import { humanize } from './commerce'

describe('commerce', () => {
  it('reads a status the console has no word for', () => {
    expect(humanize('out_for_delivery')).toBe('Out for delivery')
  })
})
