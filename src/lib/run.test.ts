import { describe, expect, it } from 'vitest'
import { answerBlocks, canContinue, counts, elapsed, emptyRun, flatTools, outcomeGroup, reduceRun, replay, runFromView, type RunEvent } from './run'

let seq = 0
const at = (s: number) => new Date(Date.UTC(2026, 10, 18, 10, 0, s)).toISOString()
function ev<T extends RunEvent['type']>(type: T, body: Omit<Extract<RunEvent, { type: T }>, 'seq' | 'at' | 'type'>, s = seq): RunEvent {
  seq += 1
  return { seq, at: at(s), type, ...body } as RunEvent
}

const started = () => ev('turn.started', { agent: { id: 'console-assistant', name: 'Console assistant' }, model: 'Claude Sonnet 5.5', deadline_s: 60 }, 0)

describe('reduceRun', () => {
  it('builds steps with their tool calls, summaries and counts', () => {
    seq = 0
    const s = replay([
      started(),
      ev('step.started', { step_id: 's1', title: 'Read reports' }, 1),
      ev('tool.started', { call_id: 'c1', step_id: 's1', tool: 'report_cases_list', label: 'last 7 days', input: { days: 7 } }, 1),
      ev('tool.started', { call_id: 'c2', step_id: 's1', tool: 'report_cases_list', label: '7 days before' }, 1),
      ev('tool.finished', { call_id: 'c1', status: 'success', duration_ms: 38, result_summary: '86', source_ids: [1, 2] }, 2),
      ev('tool.finished', { call_id: 'c2', status: 'success', duration_ms: 41, result_summary: '66', source_ids: [2, 3] }, 2),
      ev('step.finished', { step_id: 's1', summary: '86 reports this week, 66 the week before.', duration_ms: 2100 }, 3),
      ev('usage', { input_tokens: 1000, output_tokens: 200, cost_usd: 0.01, provider: 'LLM upstream' }, 3),
    ])
    expect(s.steps).toHaveLength(1)
    expect(s.steps[0]).toMatchObject({ done: true, summary: '86 reports this week, 66 the week before.', tools: ['c1', 'c2'] })
    expect(s.tools.c1).toMatchObject({ status: 'success', resultSummary: '86', sourceIds: [1, 2] })
    expect(counts(s)).toEqual({ steps: 1, tools: 2, sources: 3, tokens: 1200 })
    expect(s.provider).toBe('LLM upstream')
  })

  it('ignores an event it has seen, so a replay after Last-Event-ID is safe', () => {
    seq = 0
    const events = [started(), ev('text.delta', { delta: 'Scam reports rose' }, 1), ev('text.delta', { delta: ' to 86.' }, 1)]
    const once = replay(events)
    const twice = replay(events, once)
    expect(twice.draft).toBe('Scam reports rose to 86.')
    expect(twice.lastSeq).toBe(3)
  })

  it('keeps tool retries and puts provider switches and guardrails in the open step', () => {
    seq = 0
    const s = replay([
      started(),
      ev('step.started', { step_id: 's1', title: 'Check the rings' }, 1),
      ev('model.switched', { from_provider: 'LLM upstream', to_provider: 'Anthropic', reason: '529 overloaded' }, 1),
      ev('tool.started', { call_id: 'c1', step_id: 's1', tool: 'listing_get', label: 'l_88b4' }, 1),
      ev('tool.retry', { call_id: 'c1', attempt: 1, error: 'Timed out after 10 s', next_in_ms: 2000, timeout_ms: 10000 }, 11),
      ev('tool.retry', { call_id: 'c1', attempt: 2, error: 'Timed out after 10 s', next_in_ms: 4000, timeout_ms: 20000 }, 23),
      ev('guardrail', { rule: 'pii_masked', detail: 'Masked 3 phone numbers' }, 24),
    ])
    expect(s.tools.c1.retries.map((r) => r.attempt)).toEqual([1, 2])
    expect(s.steps[0].notes.map((n) => n.kind)).toEqual(['switch', 'guardrail'])
    expect(s.provider).toBe('Anthropic')
    expect(s.notes).toEqual([])
  })

  it('shows calls flat when the turn has no steps', () => {
    seq = 0
    const s = replay([started(), ev('tool.started', { call_id: 'c1', tool: 'account_get', label: 'Trần Đức Anh' }, 1)])
    expect(flatTools(s).map((t) => t.id)).toEqual(['c1'])
  })

  it('moves a steer from waiting to read before a step, and to unread when the run ends without it', () => {
    seq = 0
    let s = replay([started(), ev('step.started', { step_id: 's1', title: 'Plan' }, 1)])
    s = reduceRun(s, { type: 'local.steer', steer_id: 'w1', text: 'Also count fake cosmetics', at: at(2) })
    s = reduceRun(s, { type: 'local.steer', steer_id: 'w2', text: 'Only Hồ Chí Minh City', at: at(3) })
    s = replay([ev('step.finished', { step_id: 's1', summary: '', duration_ms: 800 }, 4), ev('step.started', { step_id: 's2', title: 'Read' }, 4), ev('steer.read', { steer_id: 'w1', step_id: 's2' }, 4)], s)
    expect(s.steers.find((x) => x.id === 'w1')).toMatchObject({ state: 'read', beforeStep: 2 })
    s = reduceRun(s, ev('turn.finished', { status: 'SUCCEEDED', continuable: false }, 9))
    expect(s.steers.find((x) => x.id === 'w2')?.state).toBe('unread')
  })

  it('pauses, resumes and waits for input', () => {
    seq = 0
    let s = replay([started(), ev('turn.pausing', { steps_done: 2, reason: 'member' }, 3)])
    expect(s.phase).toBe('pausing')
    s = reduceRun(s, ev('turn.paused', { steps_done: 3, reason: 'member' }, 5))
    expect(s.phase).toBe('paused')
    expect(canContinue(s)).toBe(true)
    s = reduceRun(s, ev('turn.resumed', { by: 'continue' }, 30))
    expect(s.phase).toBe('running')
    s = reduceRun(s, ev('clarify', { questions: [{ id: 'q1', label: 'Which period?', kind: 'single', options: [{ id: 'w', label: 'Last 7 days' }] }] }, 31))
    expect(s.phase).toBe('awaiting_input')
    expect(s.clarify?.[0].id).toBe('q1')
  })

  it('records waits, compaction and the context meter', () => {
    seq = 0
    const s = replay([
      started(),
      ev('rate.waiting', { until: at(40) }, 2),
      ev('context.compacting', {}, 3),
      ev('context.compacted', { summary: 'Earlier: the Gò Vấp ring', before_tokens: 180000, after_tokens: 40000 }, 4),
      ev('context.meter', { used_tokens: 41000, window_tokens: 200000 }, 5),
    ])
    expect(s.rateUntil).toBe(at(40))
    expect(s.compacting).toBe(false)
    expect(s.compactions[0]).toMatchObject({ before: 180000, after: 40000 })
    expect(s.meter).toEqual({ used: 41000, window: 200000 })
    expect(reduceRun(s, ev('step.started', { step_id: 's1', title: 'Go on' }, 41)).rateUntil).toBeUndefined()
  })

  it('collects blocks and sources, and keeps a draft without answer() as one text block', () => {
    seq = 0
    const s = replay([
      started(),
      ev('text.delta', { delta: 'Rose 31%' }, 1),
      ev('block', { block: { type: 'figures', items: [{ value: '86', label: 'reports' }] } }, 2),
      ev('block', { block: { type: 'sources', items: [{ n: 1, kind: 'data', label: 'Reports · last 7 days' }] } }, 2),
      ev('turn.finished', { status: 'SUCCEEDED', continuable: false }, 3),
    ])
    expect(s.sources.map((x) => x.n)).toEqual([1])
    expect(answerBlocks(s).map((b) => b.type)).toEqual(['text', 'figures'])
    expect(s.firstTokenAt).toBe(at(1))
    expect(elapsed(s, Date.now())).toBe(3000)
  })
})

describe('outcomeGroup', () => {
  const finished = (status: string, outcome?: string, continuable = true) => {
    seq = 0
    return replay([started(), ev('turn.finished', { status, outcome, continuable } as never, 5)])
  }

  it.each([
    ['SUCCEEDED', undefined, 'done', false],
    ['CANCELLED', 'stopped', 'stopped', true],
    ['TIMED_OUT', 'out_of_room', 'out_of_room', true],
    ['FAILED', 'broken', 'broken', true],
    ['FAILED', 'unavailable', 'unavailable', true],
    ['BUDGET', undefined, 'budget', false],
    ['FAILED', 'blocked', 'blocked', false],
  ])('%s %s is %s', (status, outcome, group, cont) => {
    const s = finished(status, outcome)
    expect(outcomeGroup(s)).toBe(group)
    expect(canContinue(s)).toBe(cont)
  })

  it('has no group while running', () => {
    expect(outcomeGroup(emptyRun())).toBeUndefined()
  })
})

describe('runFromView', () => {
  const view = {
    blocks: [],
    sources: [{ n: 2, kind: 'account' as const, label: 'B' }, { n: 1, kind: 'data' as const, label: 'A' }],
    continuable: true,
    steers: [{ steer_id: 's1', text: 'Also count fakes' }],
    created_at: at(0),
  }

  it('draws a finished turn: its answer kept as text, sources in order, and how it ended', () => {
    const s = runFromView({ ...view, status: 'timed_out', outcome: 'out_of_room', answer: 'Rose 31% [1]' })
    expect(s.phase).toBe('finished')
    expect(s.blocks).toEqual([{ type: 'text', markdown: 'Rose 31% [1]' }])
    expect(s.sources.map((x) => x.n)).toEqual([1, 2])
    expect(outcomeGroup(s)).toBe('out_of_room')
    expect(canContinue(s)).toBe(true)
    expect(s.steers[0]).toMatchObject({ id: 's1', state: 'unread' })
  })

  it('keeps a paused or waiting turn open', () => {
    expect(runFromView({ ...view, status: 'paused' }).phase).toBe('paused')
    const q = [{ id: 'p', label: 'Which period?', kind: 'single' as const, options: [] }]
    expect(runFromView({ ...view, status: 'awaiting_input', questions: q }).clarify).toEqual(q)
    expect(outcomeGroup(runFromView({ ...view, status: 'budget', continuable: false }))).toBe('budget')
  })
})
