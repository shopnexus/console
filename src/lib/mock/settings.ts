import type { AgentVersion, AiAgent, AiModel, Budgets, ModelTag, PickableAgent, Provider, Rotation, Spend, SpendRange } from '../settings'

// The stack's own data in the server's shapes (api/schemas/ai_settings.yaml):
// LiteLLM's aliases, the MCP tools and the agents' limits. Writes change
// these in memory.

export const tags: ModelTag[] = [
  { name: 'Chat', kind: 'type' },
  { name: 'Embedding', kind: 'type' },
  { name: 'Vision', kind: 'capability' },
  { name: 'Tool use', kind: 'capability' },
  { name: 'Long context', kind: 'capability' },
  { name: 'Reasoning', kind: 'capability' },
  { name: 'Structured output', kind: 'capability' },
  { name: 'Multilingual', kind: 'capability' },
]

export const ids = {
  console: '0193f000-0000-7000-8000-000000000a01',
  brief: '0193f000-0000-7000-8000-000000000a02',
  scam: '0193f000-0000-7000-8000-000000000a03',
  listing: '0193f000-0000-7000-8000-000000000a04',
  search: '0193f000-0000-7000-8000-000000000a05',
  embed: '0193f000-0000-7000-8000-000000000a06',
  khoa: '0193e000-0000-7000-8000-00000000c001',
}

export const providers: Provider[] = [
  {
    id: 'llm-upstream', name: 'LLM upstream', kind: 'openai', base_url: 'https://llm.internal/v1', key_hint: 'sk-…4f2a', weight: 50, order: 1, mode: 'pick', enabled: true,
    models: ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5'],
  },
  {
    id: 'anthropic', name: 'Anthropic', kind: 'anthropic', base_url: 'https://api.anthropic.com', key_hint: 'sk-ant-…91cd', weight: 30, order: 1, mode: 'pick', enabled: true,
    models: ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-fable-5-2', 'claude-haiku-5-5'],
  },
  {
    id: 'openrouter', name: 'OpenRouter', kind: 'openrouter', base_url: 'https://openrouter.ai/api/v1', key_hint: 'sk-or-…7be0', weight: 20, order: 2, mode: 'sync', enabled: true,
    models: ['anthropic/claude-sonnet-5-5', 'anthropic/claude-haiku-5-5', 'baai/bge-m3', 'intfloat/multilingual-e5-large'],
    synced_at: new Date(Date.now() - 40 * 60_000).toISOString(),
  },
  {
    id: 'aws-bedrock', name: 'AWS Bedrock', kind: 'bedrock', base_url: 'https://bedrock-runtime.ap-southeast-1.amazonaws.com', key_hint: 'AKIA…Q3TZ', weight: 0, order: 3, mode: 'pick', enabled: false,
    models: ['claude-opus-5-5', 'claude-sonnet-5-5'],
  },
]

const named = (id: string) => ({ id, name: providers.find((p) => p.id === id)?.name ?? id })

export const agents: AiAgent[] = [
  {
    id: ids.console, kind: 'console', name: 'Console assistant', alias: 'console-agent', icon: 'spark',
    purpose: 'Reads tickets, reports and accounts and proposes to members', required_tags: ['Chat', 'Tool use', 'Long context'], model: 'claude-sonnet-5-5',
    instructions: [
      'You assist ShopNexus staff, currently helping {{member_name}}.',
      'Read through read-only tools and propose; the member takes action.',
      'Answer briefly, in Vietnamese, and cite what you read.',
      'ShopNexus holds no money: cash on delivery with inspection only.',
    ].join('\n'),
    instructions_version: 4, tools: ['ticket_get', 'tickets_of_account', 'account_get', 'console_actions', 'order_get', 'listing_get'],
    limits: { deadline_s: 60, max_model_calls: 12, context_window: 200_000, tool_timeout_s: 10, tool_attempts: 3, max_tokens: 4096 }, monthly_budget_usd: 250,
    enabled: true, updated_by: ids.khoa, updated_at: new Date().toISOString(),
  },
  {
    id: ids.brief, kind: 'console', name: 'Weekly brief', alias: 'weekly-brief', icon: 'article', purpose: 'Writes longer briefs and reports as documents',
    required_tags: ['Chat', 'Tool use', 'Long context', 'Reasoning'], model: 'claude-opus-5-5', instructions: 'Write a brief for the period the member names, as a document with sections and charts.',
    instructions_version: 1, tools: ['ticket_get', 'account_get', 'console_actions', 'listing_get', 'report_cases_list'],
    limits: { deadline_s: 300, max_model_calls: 30, context_window: 1_000_000, max_tokens: 16000 }, monthly_budget_usd: 50, enabled: true, updated_by: ids.khoa,
    updated_at: new Date().toISOString(),
  },
  {
    id: ids.scam, kind: 'app', name: 'Scam check', alias: 'scam-check', icon: 'shield', purpose: 'Reads in-app chat messages and warns buyers',
    required_tags: ['Chat', 'Structured output'], model: 'claude-haiku-5-5', instructions_version: 0, tools: [], limits: { timeout_s: 10 }, monthly_budget_usd: 20,
    enabled: true, updated_at: new Date().toISOString(),
  },
  {
    id: ids.listing, kind: 'app', name: 'Listing photo reader', alias: 'listing-read', icon: 'photo', purpose: "Fills in name, category and condition from a seller's photos",
    required_tags: ['Chat', 'Vision'], model: 'claude-haiku-5-5', instructions_version: 0, tools: [], limits: { timeout_s: 20 }, monthly_budget_usd: 15, enabled: true,
    updated_at: new Date().toISOString(),
  },
  {
    id: ids.search, kind: 'app', name: 'Search', alias: 'search', icon: 'search', purpose: 'Understands natural searches in the app', required_tags: ['Chat', 'Structured output'],
    model: 'claude-haiku-5-5', instructions_version: 0, tools: [], limits: { timeout_s: 5 }, monthly_budget_usd: 2, enabled: true, updated_at: new Date().toISOString(),
  },
  {
    id: ids.embed, kind: 'app', name: 'Search embeddings', alias: 'embed-text', icon: 'hub', purpose: 'Turns listings and searches into vectors', required_tags: ['Embedding', 'Multilingual'],
    model: 'baai/bge-m3', instructions_version: 0, tools: [], limits: { timeout_s: 5 }, enabled: true, updated_at: new Date().toISOString(),
  },
]

const agentRefs = (model: string) => agents.filter((a) => a.model === model).map((a) => ({ id: a.id, name: a.name }))

const modelTags: Record<string, string[]> = {
  'claude-opus-5-5': ['Chat', 'Vision', 'Tool use', 'Long context', 'Reasoning', 'Structured output'],
  'claude-sonnet-5-5': ['Chat', 'Vision', 'Tool use', 'Long context', 'Reasoning', 'Structured output'],
  'claude-fable-5-2': ['Chat', 'Tool use', 'Long context', 'Structured output'],
  'claude-haiku-5-5': ['Chat', 'Vision', 'Tool use', 'Structured output'],
  'baai/bge-m3': ['Embedding', 'Multilingual'],
  'intfloat/multilingual-e5-large': ['Embedding', 'Multilingual'],
  'anthropic/claude-sonnet-5-5': [],
  'anthropic/claude-haiku-5-5': [],
}

const prices: Record<string, [number, number?]> = {
  'claude-opus-5-5': [5, 25],
  'claude-sonnet-5-5': [2, 10],
  'claude-fable-5-2': [1.5, 7.5],
  'claude-haiku-5-5': [1, 1],
  'baai/bge-m3': [1],
  'intfloat/multilingual-e5-large': [0.5],
}

const contexts: Record<string, number> = {
  'claude-opus-5-5': 1_000_000,
  'claude-sonnet-5-5': 1_000_000,
  'claude-fable-5-2': 400_000,
  'claude-haiku-5-5': 200_000,
  'baai/bge-m3': 8_000,
  'intfloat/multilingual-e5-large': 512,
}

/** Every model some provider serves, with the providers and agents on it. */
export function models(): AiModel[] {
  const all = [...new Set(providers.flatMap((p) => p.models))]
  return all.map((model) => ({
    model,
    tags: modelTags[model] ?? [],
    providers: providers.filter((p) => p.models.includes(model)).map((p) => named(p.id)),
    agents: agentRefs(model),
    input_cost_per_mtok: prices[model]?.[0],
    output_cost_per_mtok: prices[model]?.[1],
    context_tokens: contexts[model],
  }))
}

export function setTags(model: string, list: string[]) {
  modelTags[model] = list
  return { model, tags: list }
}

export const versions: AgentVersion[] = [
  { version: 4, instructions: agents[0].instructions!, created_by: ids.khoa, created_at: '2026-11-12T08:40:00Z' },
  { version: 3, instructions: agents[0].instructions!.replace('Answer briefly, ', 'Answer '), created_by: ids.khoa, created_at: '2026-11-02T10:00:00Z' },
  { version: 2, instructions: agents[0].instructions!.split('\n').slice(0, 2).join('\n'), created_by: ids.khoa, created_at: '2026-10-20T09:00:00Z' },
]

export const rotation: Rotation = { routing_strategy: 'simple-shuffle', num_retries: 2, allowed_fails: 3, cooldown_s: 300, timeout_s: 30 }

const spent: Record<string, number> = { [ids.console]: 128.4, [ids.brief]: 11.2, [ids.scam]: 8.1, [ids.listing]: 3.9, [ids.search]: 1.6, [ids.embed]: 0.3 }

export const budgetState: Omit<Budgets, 'agents' | 'alerting'> = {
  monthly_cap_usd: 300,
  alert_pct: 80,
  on_cap: 'stop_agents',
  member_daily_usd: { moderator: 5, admin: 10 },
  overrides: [
    { member_id: '0193e000-0000-7000-8000-00000000c003', daily_usd: 7 },
    { member_id: '0193e000-0000-7000-8000-00000000c004', daily_usd: 6 },
  ],
}

export function budgets(): Budgets {
  const total = Object.values(spent).reduce((a, b) => a + b, 0)
  return {
    agents: agents.map((a) => ({ agent_id: a.id, name: a.name, kind: a.kind, monthly_budget_usd: a.monthly_budget_usd, spent_usd: spent[a.id] ?? 0 })),
    ...budgetState,
    alerting: !!budgetState.monthly_cap_usd && total / budgetState.monthly_cap_usd >= (budgetState.alert_pct ?? 100) / 100,
  }
}

/** The month's spend so far over every agent. */
export const monthSpent = () => Object.values(spent).reduce((a, b) => a + b, 0)

const daily = [
  [2.4, 0.3, 0.2, 0.1], [3.4, 0.4, 0.2, 0.1], [4.9, 0.5, 0.3, 0.1], [4.1, 0.4, 0.2, 0.1], [5.4, 0.5, 0.3, 0.1], [1.6, 0.3, 0.1, 0.1],
  [1.3, 0.3, 0.1, 0.1], [6.2, 0.5, 0.3, 0.1], [7.3, 0.6, 0.3, 0.1], [5.9, 0.5, 0.3, 0.1], [8.0, 0.6, 0.3, 0.1], [7.1, 0.6, 0.3, 0.1],
  [2.4, 0.4, 0.1, 0.1], [1.9, 0.3, 0.1, 0.1], [8.6, 0.7, 0.3, 0.1], [9.4, 0.7, 0.3, 0.1], [7.6, 0.6, 0.3, 0.1], [3.4, 0.4, 0.2, 0.1],
]

/** LiteLLM's spend by day over a range ending today. */
export function spend(range: SpendRange): Spend {
  const n = range === '7d' ? 7 : range === '30d' ? 30 : 90
  const end = new Date()
  const order = [ids.console, ids.scam, ids.listing, ids.search]
  const days = Array.from({ length: n }, (_, i) => {
    const d = new Date(end)
    d.setDate(end.getDate() - (n - 1 - i))
    const row = daily[i % daily.length]
    const agentsOf = order.map((agent_id, j) => ({ agent_id, usd: row[j] }))
    return { date: d.toISOString().slice(0, 10), total_usd: Math.round(agentsOf.reduce((s, a) => s + a.usd, 0) * 100) / 100, agents: agentsOf }
  })
  const scale = n / 30
  const members = [
    { member_id: '0193e000-0000-7000-8000-00000000c002', display_name: 'Nguyễn Thị Lan', usd: 38.2, requests: 312 },
    { member_id: '0193e000-0000-7000-8000-00000000c004', display_name: 'Phạm Văn Minh', usd: 31.6, requests: 268 },
    { member_id: '0193e000-0000-7000-8000-00000000c003', display_name: 'Lê Thu Hà', usd: 22.9, requests: 201 },
    { member_id: '0193e000-0000-7000-8000-00000000c005', display_name: 'Đỗ Quang Tú', usd: 17.3, requests: 164 },
  ].map((m) => ({ ...m, usd: Math.round(m.usd * scale * 100) / 100, requests: Math.round(m.requests * scale) }))
  return { range, start: days[0].date, end: days[n - 1].date, total_usd: Math.round(days.reduce((s, d) => s + d.total_usd, 0) * 100) / 100, days, members }
}

export function pickable(): PickableAgent[] {
  return agents.filter((a) => a.kind === 'console' && a.enabled).map(({ id, name, icon, purpose }) => ({ id, name, icon, purpose, default: id === ids.console }))
}

const span = (range: SpendRange) => (range === '7d' ? 7 : range === '30d' ? 30 : 90)
const dates = (n: number) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (n - 1 - i))
    return d.toISOString().slice(0, 10)
  })
const series = (base: number[], n: number) => dates(n).map((date, i) => ({ date, v: base[i % base.length] }))

const usageBase: Record<string, number[]> = {
  [ids.console]: [30, 42, 38, 55, 61, 48, 70, 66, 74, 80],
  [ids.brief]: [2, 4, 3, 6, 5, 7, 6],
  [ids.scam]: [600, 580, 640, 700, 660, 720, 750, 710, 780, 820],
  [ids.listing]: [400, 440, 390, 500, 470, 520, 490, 550, 510, 540],
  [ids.search]: [700, 740, 800, 770, 850, 900, 880, 940, 970, 990],
  [ids.embed]: [1500, 1520, 1550, 1530, 1580, 1600, 1590, 1630, 1620, 1660],
}

/** Requests per agent by day; the mockups' sparklines, repeated over the range. */
export function agentUsage(range: SpendRange) {
  const n = span(range)
  return {
    items: agents.map((a) => {
      const days = series(usageBase[a.id] ?? [1], n).map(({ date, v }) => ({ date, requests: Math.round(v / 7) }))
      return { agent_id: a.id, requests: days.reduce((s, d) => s + d.requests, 0), days }
    }),
  }
}

export const health = [
  { id: 'llm-upstream', requests_24h: 9120, share_pct: 48, success_pct: 99.9, p50_ms: 1100 },
  { id: 'anthropic', requests_24h: 6270, share_pct: 33, success_pct: 99.7, p50_ms: 1300 },
  { id: 'openrouter', requests_24h: 3610, share_pct: 19, success_pct: 99.2, p50_ms: 1600 },
  { id: 'aws-bedrock', requests_24h: 0, share_pct: 0, success_pct: 0, p50_ms: 0, cooling_until: new Date(Date.now() + 25 * 60_000).toISOString(), last_error: 'Invalid API key · 3 errors' },
]

/** A provider's own list of models, added or not. */
export function providerOptions(id: string) {
  const p = providers.find((x) => x.id === id)
  const catalogue: Record<string, string[]> = {
    anthropic: ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-fable-5-2', 'claude-haiku-5-5', 'claude-opus-5', 'claude-sonnet-5', 'claude-haiku-5'],
    'llm-upstream': ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5', 'claude-fable-5-2'],
    openrouter: p?.models ?? [],
    'aws-bedrock': ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5'],
  }
  const names = [...new Set([...(catalogue[id] ?? []), ...(p?.models ?? [])])]
  return {
    items: names.map((model) => ({
      model,
      tags: modelTags[model] ?? (model.includes('claude') ? ['Chat', 'Vision', 'Tool use'] : undefined),
      input_cost_per_mtok: prices[model]?.[0],
      output_cost_per_mtok: prices[model]?.[1],
      context_tokens: contexts[model] ?? (model.includes('claude') ? 200_000 : undefined),
      added: !!p?.models.includes(model),
    })),
  }
}

const toolBase: Record<string, [number[], number, number]> = {
  ticket_get: [[20, 26, 31, 28, 35, 33, 38], 4, 51],
  tickets_of_account: [[8, 9, 12, 10, 11, 9, 13], 0, 44],
  account_get: [[30, 34, 29, 38, 41, 37, 44], 2, 42],
  console_actions: [[6, 8, 7, 9, 8, 10, 9], 0, 30],
  order_get: [[14, 18, 16, 20, 17, 22, 21], 1, 47],
  listing_get: [[18, 21, 25, 22, 27, 24, 29], 6, 38],
  report_cases_list: [[5, 6, 4, 7, 6, 8, 7], 0, 40],
}

/** Calls per tool and the latest calls. */
export function toolsUsage(range: SpendRange) {
  const n = span(range)
  const now = Date.now()
  return {
    items: Object.entries(toolBase).map(([name, [base, failed, p50]]) => {
      const days = series(base, n).map(({ date, v }) => ({ date, calls: v * 9 }))
      return { name, calls: days.reduce((s, d) => s + d.calls, 0), failed: Math.round((failed * n) / 7), p50_ms: p50, days }
    }),
    recent: [
      { tool: 'account_get', label: 'Đồ Cũ Gò Vấp', member_id: '0193e000-0000-7000-8000-00000000c002', duration_ms: 42, status: 'success' as const, ago: 2 },
      { tool: 'listing_get', label: 'iPhone 13 Pro Max 256GB', member_id: '0193e000-0000-7000-8000-00000000c002', duration_ms: 38, status: 'success' as const, ago: 3 },
      { tool: 'ticket_get', label: 'Khánh Linh · not received', member_id: '0193e000-0000-7000-8000-00000000c004', duration_ms: 51, status: 'success' as const, ago: 55 },
      { tool: 'order_get', label: 'GHTK S1.A1.17373471', member_id: '0193e000-0000-7000-8000-00000000c004', duration_ms: 1800, status: 'failed' as const, ago: 56 },
    ].map((r, i) => ({ call_id: `0194a000-0000-7000-8000-00000000000${i}`, turn_id: '0194b000-0000-7000-8000-000000000001', member_id: r.member_id, tool: r.tool, label: r.label, duration_ms: r.duration_ms, status: r.status, at: new Date(now - r.ago * 60_000).toISOString() })),
  }
}

export const dashboards: { app: string; name: string; floor: 'moderator' | 'admin' }[] = [
  { app: 'grafana', name: 'Grafana', floor: 'moderator' },
  { app: 'restate', name: 'Restate', floor: 'admin' },
  { app: 'litellm', name: 'LiteLLM', floor: 'admin' },
  { app: 's3', name: 'RustFS', floor: 'admin' },
  { app: 'db', name: 'pgweb', floor: 'admin' },
  { app: 'argocd', name: 'Argo CD', floor: 'admin' },
]

/** Guardrail blocks per rule and the latest ones; the server reports loop_stopped and rate_limited for now. */
export function guardrails(range: SpendRange) {
  const n = span(range)
  const now = Date.now()
  return {
    items: [
      { rule: 'loop_stopped', count: Math.round((3 * n) / 7) },
      { rule: 'rate_limited', count: Math.round((2 * n) / 7) },
    ],
    recent: [
      { rule: 'loop_stopped', detail: 'Stopped after 6 listing_get calls', member_id: '0193e000-0000-7000-8000-00000000c004', turn_id: '0194b000-0000-7000-8000-000000000002', at: new Date(now - 20 * 3600_000).toISOString() },
      { rule: 'rate_limited', detail: '30 questions in a minute', member_id: '0193e000-0000-7000-8000-00000000c005', turn_id: '0194b000-0000-7000-8000-000000000003', at: new Date(now - 26 * 3600_000).toISOString() },
    ],
  }
}
