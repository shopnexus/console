import { describe, expect, it } from 'vitest'
import type { Source } from './run'
import { accountStatus, kindOf, sourceHref, sourceLabel, sourceMeta } from './sources'

const src = (over: Partial<Source>): Source => ({ n: 1, kind: 'data', label: '', ...over })

describe('sources', () => {
  it('never names a source "Record <id>": the tool that read it stands in', () => {
    expect(sourceLabel(src({ label: 'Record 01a1ef31', tool: 'tickets_list' }))).toBe('Support tickets')
    expect(sourceLabel(src({ label: 'Account 7d22e9aa', kind: 'account' }))).toBe('Account')
    expect(sourceLabel(src({ label: 'Trần Đức Anh' }))).toBe('Trần Đức Anh')
    expect(sourceMeta(src({ kind: 'ticket', record_id: '01a1ef31-aaaa' }))).toBe('Ticket · 01a1ef31')
  })

  it('reads an unknown kind as data, and an account’s state from its meta', () => {
    expect(kindOf('invoice')).toBe('data')
    expect(accountStatus(src({ kind: 'account', meta: 'Seller · suspended' }))).toBe('suspended')
    expect(accountStatus(src({ kind: 'ticket' }))).toBeUndefined()
  })

  it('opens a record where the console has a page for it', () => {
    expect(sourceHref(src({ kind: 'account', record_id: 'a' }))).toBe('/accounts/a')
    expect(sourceHref(src({ kind: 'report', record_id: 'a' }))).toBe('/reports/a')
    expect(sourceHref(src({ kind: 'ticket', record_id: 't' }))).toBe('/support/t')
    expect(sourceHref(src({ kind: 'member', record_id: 'm' }))).toBeUndefined()
    expect(sourceHref(src({ kind: 'member', record_id: 'm' }), true)).toBe('/settings/members')
    expect(sourceHref(src({ kind: 'order', record_id: 'o' }))).toBe('/orders/o')
    expect(sourceHref(src({ kind: 'listing', record_id: 'l' }))).toBe('/listings/l')
    expect(sourceHref(src({ kind: 'data', record_id: 'd' }))).toBeUndefined()
  })
})
