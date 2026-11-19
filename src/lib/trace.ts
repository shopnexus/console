import { count } from './format'
import type { ToolCall } from './run'

/*
 * How a tool call reads in the run's activity (AI Portal's trace-kind and
 * trace-grouping, for our calls): its title, its meta and how calls fold.
 */

const skipKeys = new Set(['limit', 'offset', 'cursor', 'page', 'page_size'])

/** What a call was run on, from its input: "tickets", "open", "suspended". */
export function detailOf(input: unknown): string {
  if (!input || typeof input !== 'object' || Array.isArray(input) || 'truncated' in input) return ''
  const parts: string[] = []
  for (const [k, v] of Object.entries(input)) {
    if (skipKeys.has(k)) continue
    if (typeof v === 'string' && v.trim() && !/^\d{4}-\d\d-\d\dT/.test(v)) parts.push(v.trim())
    else if (typeof v === 'number' && !/_id$|^id$/.test(k)) parts.push(String(v))
    else if (v === true) parts.push(k.replace(/_/g, ' '))
  }
  const text = parts.join(', ')
  return text.length > 60 ? `${text.slice(0, 59)}…` : text
}

/** A row's title: the tool's label in quiet ink, then what it was run on. */
export function rowTitle(call: ToolCall): { verb?: string; text: string } {
  const label = call.label || call.tool.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
  const detail = detailOf(call.input)
  return detail ? { verb: label, text: detail } : { text: label }
}

/** A summary that is text to read, not the raw result the agent passed on. */
function readable(summary?: string): string | undefined {
  if (!summary || /^[[{"]/.test(summary) || summary.startsWith('Failed:')) return undefined
  return summary
}

/** The meta a row carries: how often, what came back, and what went wrong. */
export function metaOf(calls: ToolCall[]): string[] {
  const lead = calls[0]
  const records = lead.sourceIds.length
  return [
    calls.length > 1 ? `${calls.length} times` : records ? count(records, 'record') : lead.status === 'success' ? readable(lead.resultSummary) : undefined,
    lead.status === 'failed' ? "Didn't work" : undefined,
    lead.status === 'skipped' ? 'Not run' : undefined,
    lead.status === 'running' && lead.retries.length ? `Attempt ${lead.retries.length + 1}` : undefined,
  ].filter((p): p is string => !!p)
}

/** Calls to one tool about one thing, as one row; a running call stays its own row. */
export function groupCalls(calls: ToolCall[]): ToolCall[][] {
  const groups: ToolCall[][] = []
  const done = new Map<string, ToolCall[]>()
  for (const c of calls) {
    if (c.status !== 'success') {
      groups.push([c])
      continue
    }
    const key = `${c.tool}\0${detailOf(c.input)}`
    const found = done.get(key)
    if (found) found.push(c)
    else {
      const g = [c]
      done.set(key, g)
      groups.push(g)
    }
  }
  return groups
}

