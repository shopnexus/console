import { describe, expect, it } from 'vitest'
import type { ToolCall } from './run'
import { detailOf, groupCalls, metaOf, rowTitle } from './trace'

const call = (over: Partial<ToolCall>): ToolCall => ({ id: 'c', tool: 'count', label: 'Counts', status: 'success', startedAt: '', sourceIds: [], retries: [], ...over })

describe('trace rows', () => {
  it('titles a call by its label and what it ran on, leaving paging and dates out', () => {
    expect(detailOf({ entity: 'tickets', since: '2026-11-18T00:00:00+07:00', limit: 50 })).toBe('tickets')
    expect(detailOf({ suspended: true })).toBe('suspended')
    expect(rowTitle(call({ input: { entity: 'tickets' } }))).toEqual({ verb: 'Counts', text: 'tickets' })
    expect(rowTitle(call({ label: '', tool: 'tickets_list' }))).toEqual({ text: 'Tickets list' })
  })

  it('never shows a raw result as meta', () => {
    expect(metaOf([call({ resultSummary: '[{"text":"{}"}]' })])).toEqual([])
    expect(metaOf([call({ sourceIds: [1, 2] })])).toEqual(['2 records'])
    expect(metaOf([call({ status: 'failed', resultSummary: 'Failed: boom' })])).toEqual(["Didn't work"])
  })

  it('folds finished calls to one tool about one thing', () => {
    const groups = groupCalls([call({ id: 'a', input: { entity: 'tickets' } }), call({ id: 'b', input: { entity: 'accounts' } }), call({ id: 'c', input: { entity: 'tickets' } })])
    expect(groups.map((g) => g.map((c) => c.id))).toEqual([['a', 'c'], ['b']])
    expect(metaOf(groups[0])).toEqual(['2 times'])
  })
})
