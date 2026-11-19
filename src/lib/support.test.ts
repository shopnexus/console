import { describe, expect, it } from 'vitest'
import { type Ticket, ticketTitle } from './support'

const base: Ticket = { id: 't', kind: 'other', status: 'open', conversation_id: 'c', opened_at: '2026-11-19T00:00:00Z', events: [] }

describe('ticketTitle', () => {
  it('names a ticket by its request', () => {
    expect(ticketTitle({ ...base, kind: 'carrier_request', carrier_name: 'GHN' })).toBe('Carrier request · GHN')
    expect(ticketTitle({ ...base, kind: 'not_received', order: { id: 'o', title: 'Áo khoác' } })).toBe('Not received · Áo khoác')
    expect(ticketTitle(base, '  Tôi muốn\n đổi số  ')).toBe('Other request · Tôi muốn đổi số')
  })
  it('keeps to the kind without a request line, and reads first words only for other', () => {
    expect(ticketTitle(base)).toBe('Other request')
    expect(ticketTitle({ ...base, kind: 'not_received' }, 'Chưa nhận')).toBe('Not received')
    expect(ticketTitle(base, 'x'.repeat(80))).toBe(`Other request · ${'x'.repeat(59)}…`)
  })
})
