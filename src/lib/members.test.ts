import { describe, expect, it } from 'vitest'
import type { Member } from './api'
import { needsAttention, signInOf, signInText } from './members'

const now = Date.parse('2026-11-22T10:00:00Z')
const base: Member = {
  id: 'm1',
  email: 'lan@example.com',
  display_name: 'Lan',
  role: 'moderator',
  status: 'active',
  totp_enrolled: true,
  must_change_password: false,
  last_sign_in_at: '2026-11-21T10:00:00Z',
  created_at: '2026-10-01T10:00:00Z',
}

describe('signInOf', () => {
  it('reads the state that waits on something first', () => {
    expect(signInOf(base, now)).toBe('ok')
    expect(signInOf({ ...base, status: 'disabled', locked_until: '2026-11-22T11:00:00Z' }, now)).toBe('disabled')
    expect(signInOf({ ...base, locked_until: '2026-11-22T11:00:00Z' }, now)).toBe('locked')
    expect(signInOf({ ...base, locked_until: '2026-11-22T09:00:00Z' }, now)).toBe('ok')
    expect(signInOf({ ...base, last_sign_in_at: undefined, must_change_password: true, totp_enrolled: false }, now)).toBe('never')
    expect(signInOf({ ...base, must_change_password: true }, now)).toBe('reset')
    expect(signInText({ ...base, totp_enrolled: false }, now)).toBe('Two-step not set up')
  })

  it('leaves the fine and the disabled out of needs attention', () => {
    expect(needsAttention(base, now)).toBe(false)
    expect(needsAttention({ ...base, status: 'disabled' }, now)).toBe(false)
    expect(needsAttention({ ...base, last_sign_in_at: undefined }, now)).toBe(true)
  })
})
