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
    id: 'llm-upstream', name: 'LLM upstream', kind: 'openai', base_url: 'https://llm.internal/v1', key_hint: 'sk-…4f2a', weight: 50, order: 1, mode: 'pick',
    models: ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5'],
  },
  {
    id: 'anthropic', name: 'Anthropic', kind: 'anthropic', base_url: 'https://api.anthropic.com', key_hint: 'sk-ant-…91cd', weight: 30, order: 1, mode: 'pick',
    models: ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-fable-5-2', 'claude-haiku-5-5'],
  },
  {
    id: 'openrouter', name: 'OpenRouter', kind: 'openrouter', base_url: 'https://openrouter.ai/api/v1', key_hint: 'sk-or-…7be0', weight: 20, order: 2, mode: 'sync',
    models: ['anthropic/claude-sonnet-5-5', 'anthropic/claude-haiku-5-5', 'baai/bge-m3', 'intfloat/multilingual-e5-large'],
    synced_at: new Date(Date.now() - 40 * 60_000).toISOString(),
  },
  {
    id: 'aws-bedrock', name: 'AWS Bedrock', kind: 'bedrock', base_url: 'https://bedrock-runtime.ap-southeast-1.amazonaws.com', key_hint: 'AKIA…Q3TZ', weight: 0, order: 3, mode: 'pick',
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

export const budgetState = { member_daily_usd: 5 as number | undefined }

export function budgets(): Budgets {
  return {
    agents: agents.map((a) => ({ agent_id: a.id, name: a.name, kind: a.kind, monthly_budget_usd: a.monthly_budget_usd, spent_usd: spent[a.id] ?? 0 })),
    member_daily_usd: budgetState.member_daily_usd,
  }
}

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
  return { range, start: days[0].date, end: days[n - 1].date, total_usd: Math.round(days.reduce((s, d) => s + d.total_usd, 0) * 100) / 100, days }
}

export function pickable(): PickableAgent[] {
  return agents.filter((a) => a.kind === 'console' && a.enabled).map(({ id, name, icon, purpose }) => ({ id, name, icon, purpose, default: id === ids.console }))
}
