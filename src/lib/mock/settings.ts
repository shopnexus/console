import type { AgentVersion, AiAgent, AiModel, Budgets, ModelTag, PickableAgent, Provider, ProviderModel, Rotation, Spend } from '../settings'

// The stack's own data, as in the soft-cfg-* mockups: LiteLLM's aliases,
// the MCP tools and the agent's limits. Writes change these in memory.

export const tags: ModelTag[] = [
  { name: 'Chat', kind: 'type', sort: 1 },
  { name: 'Embedding', kind: 'type', sort: 2 },
  { name: 'Vision', kind: 'capability', sort: 3 },
  { name: 'Tool use', kind: 'capability', sort: 4 },
  { name: 'Long context', kind: 'capability', sort: 5 },
  { name: 'Reasoning', kind: 'capability', sort: 6 },
  { name: 'Structured output', kind: 'capability', sort: 7 },
  { name: 'Multilingual', kind: 'capability', sort: 8 },
]

export const providers: Provider[] = [
  {
    id: 'p-upstream', name: 'LLM upstream', kind: 'openai_compatible', base_url: 'https://llm.internal/v1', key_hint: 'sk-…4f2a',
    weight: 50, order: 1, enabled: true, models_mode: 'pick', model_count: 4, status: 'healthy',
    stats_24h: { share_pct: 48, success_pct: 99.9, p50_ms: 1100, requests: 9120, series: [50, 52, 49, 51, 48, 50, 47, 49] },
  },
  {
    id: 'p-anthropic', name: 'Anthropic', kind: 'anthropic', base_url: 'https://api.anthropic.com', key_hint: 'sk-ant-…91cd',
    weight: 30, order: 2, enabled: true, models_mode: 'pick', model_count: 4, status: 'healthy',
    stats_24h: { share_pct: 33, success_pct: 99.7, p50_ms: 1300, requests: 6270, series: [28, 30, 31, 29, 33, 32, 34, 33] },
  },
  {
    id: 'p-openrouter', name: 'OpenRouter', kind: 'openrouter', base_url: 'https://openrouter.ai/api/v1', key_hint: 'sk-or-…7be0',
    weight: 20, order: 3, enabled: true, models_mode: 'sync', model_count: 4, status: 'healthy',
    stats_24h: { share_pct: 19, success_pct: 99.2, p50_ms: 1600, requests: 3610, series: [22, 20, 21, 19, 18, 20, 19, 19] },
  },
  {
    id: 'p-bedrock', name: 'AWS Bedrock', kind: 'bedrock', base_url: 'https://bedrock-runtime.ap-southeast-1.amazonaws.com', key_hint: 'AKIA…Q3TZ',
    weight: 0, order: 4, enabled: false, models_mode: 'pick', model_count: 2, status: 'paused', paused_until: new Date(Date.now() + 25 * 60_000).toISOString(),
    last_error: 'Invalid API key · 3 errors', stats_24h: { share_pct: 0, success_pct: 0, p50_ms: 0, requests: 0, series: [6, 5, 4, 2, 0, 0, 0, 0] },
  },
]

export const models: AiModel[] = [
  { model: 'Claude Opus 5.5', family: 'Anthropic', tags: ['Chat', 'Vision', 'Tool use', 'Long context', 'Reasoning', 'Structured output'], providers: ['p-upstream', 'p-anthropic', 'p-bedrock'], price_in_usd: 5, price_out_usd: 25, context_tokens: 1_000_000, used_by: [] },
  { model: 'Claude Sonnet 5.5', family: 'Anthropic', tags: ['Chat', 'Vision', 'Tool use', 'Long context', 'Reasoning', 'Structured output'], providers: ['p-upstream', 'p-anthropic', 'p-openrouter', 'p-bedrock'], price_in_usd: 2, price_out_usd: 10, context_tokens: 1_000_000, p50_ms: 2100, used_by: ['console-assistant'] },
  { model: 'Claude Fable 5.2', family: 'Anthropic', tags: ['Chat', 'Tool use', 'Long context', 'Structured output'], providers: ['p-anthropic'], price_in_usd: 1.5, price_out_usd: 7.5, context_tokens: 400_000, used_by: [] },
  { model: 'Claude Haiku 5.5', family: 'Anthropic', tags: ['Chat', 'Vision', 'Tool use', 'Structured output'], providers: ['p-upstream', 'p-anthropic', 'p-openrouter'], price_in_usd: 1, price_out_usd: 1, context_tokens: 200_000, p50_ms: 600, used_by: ['scam-check', 'listing-read', 'search'] },
  { model: 'bge-m3', family: 'BAAI', tags: ['Embedding', 'Multilingual'], providers: ['p-openrouter'], price_in_usd: 1, context_tokens: 8_000, used_by: ['embed-text'] },
  { model: 'multilingual-e5-large', family: 'Microsoft', tags: ['Embedding', 'Multilingual'], providers: ['p-openrouter'], price_in_usd: 0.5, context_tokens: 512, used_by: [] },
]

const instructions = [
  'You assist ShopNexus staff, currently helping {{member_name}}.',
  'Read through read-only tools and propose; the member takes action.',
  'Answer briefly, in Vietnamese, and cite what you read.',
  'ShopNexus holds no money: cash on delivery with inspection only.',
].join('\n')

const now = new Date().toISOString()

export const agents: AiAgent[] = [
  {
    id: 'console-assistant', kind: 'console', name: 'Console assistant', alias: 'console-agent', icon: 'spark',
    purpose: 'Reads tickets, reports and accounts and proposes to members', required_tags: ['Chat', 'Tool use', 'Long context'],
    model: 'Claude Sonnet 5.5', instructions, instructions_version: 4, tools: ['ticket_get', 'tickets_of_account', 'account_get', 'console_actions', 'order_get', 'listing_get'],
    limits: { deadline_s: 60, max_tokens: 4096, history_turns: 20 }, monthly_budget_usd: 250, enabled: true, updated_by: 'Trần Minh Khoa', updated_at: now,
    usage: { requests_7d: 1284, spend_month_usd: 128.4, series: [30, 42, 38, 55, 61, 48, 70, 66, 74, 80] },
  },
  {
    id: 'scam-check', kind: 'app', name: 'Scam check', alias: 'scam-check', icon: 'shield',
    purpose: 'Reads in-app chat messages and warns buyers', required_tags: ['Chat', 'Structured output'], model: 'Claude Haiku 5.5',
    instructions: 'Classify each chat message as safe or a likely scam, with a short reason in Vietnamese.', instructions_version: 2, tools: [],
    limits: { deadline_s: 10, max_tokens: 512, history_turns: 0 }, monthly_budget_usd: 20, enabled: true, updated_at: now,
    usage: { requests_7d: 18902, spend_month_usd: 8.1, series: [60, 58, 64, 70, 66, 72, 75, 71, 78, 82] },
  },
  {
    id: 'listing-read', kind: 'app', name: 'Listing photo reader', alias: 'listing-read', icon: 'photo',
    purpose: "Fills in name, category and condition from a seller's photos", required_tags: ['Chat', 'Vision'], model: 'Claude Haiku 5.5',
    instructions: 'Read the listing photos and fill in the name, category and condition.', instructions_version: 3, tools: [],
    limits: { deadline_s: 20, max_tokens: 1024, history_turns: 0 }, monthly_budget_usd: 15, enabled: true, updated_at: now,
    usage: { requests_7d: 6410, spend_month_usd: 3.9, series: [40, 44, 39, 50, 47, 52, 49, 55, 51, 54] },
  },
  {
    id: 'search', kind: 'app', name: 'Search', alias: 'search', icon: 'search',
    purpose: 'Understands natural searches in the app', required_tags: ['Chat', 'Structured output'], model: 'Claude Haiku 5.5',
    instructions: 'Turn a natural search into filters and keywords.', instructions_version: 1, tools: [],
    limits: { deadline_s: 5, max_tokens: 256, history_turns: 0 }, monthly_budget_usd: 2, enabled: true, updated_at: now,
    usage: { requests_7d: 31277, spend_month_usd: 1.6, series: [70, 74, 80, 77, 85, 90, 88, 94, 97, 99] },
  },
  {
    id: 'embed-text', kind: 'app', name: 'Search embeddings', alias: 'embed-text', icon: 'hub',
    purpose: 'Turns listings and searches into vectors', required_tags: ['Embedding', 'Multilingual'], model: 'bge-m3',
    instructions: '', instructions_version: 1, tools: [], limits: { deadline_s: 5, max_tokens: 0, history_turns: 0 }, monthly_budget_usd: 5, enabled: true, updated_at: now,
    usage: { requests_7d: 52118, spend_month_usd: 0.3, series: [50, 52, 55, 53, 58, 60, 59, 63, 62, 66] },
  },
]

export const versions: AgentVersion[] = [
  { version: 4, by: 'Khoa', at: '2026-11-12T08:40:00Z', instructions },
  { version: 3, by: 'Bảo', at: '2026-11-02T10:00:00Z', instructions: instructions.replace('Answer briefly, ', '') },
  { version: 2, by: 'Khoa', at: '2026-10-20T09:00:00Z', instructions: instructions.split('\n').slice(0, 2).join('\n') },
]

export const rotation: Rotation = { strategy: 'weighted', num_retries: 2, allowed_fails: 3, cooldown_s: 300, timeout_s: 30 }

export const budgets: Budgets = {
  monthly_cap_usd: 300,
  alert_pct: 80,
  on_cap: 'stop_console',
  member_daily_usd: { moderator: 5, admin: 10 },
  overrides: [
    { member_id: 'm-ha', display_name: 'Lê Thu Hà', daily_usd: 7 },
    { member_id: 'm-minh', display_name: 'Phạm Văn Minh', daily_usd: 6 },
  ],
}

const daily = [
  [2.4, 0.3, 0.2, 0.1], [3.4, 0.4, 0.2, 0.1], [4.9, 0.5, 0.3, 0.1], [4.1, 0.4, 0.2, 0.1], [5.4, 0.5, 0.3, 0.1], [1.6, 0.3, 0.1, 0.1],
  [1.3, 0.3, 0.1, 0.1], [6.2, 0.5, 0.3, 0.1], [7.3, 0.6, 0.3, 0.1], [5.9, 0.5, 0.3, 0.1], [8.0, 0.6, 0.3, 0.1], [7.1, 0.6, 0.3, 0.1],
  [2.4, 0.4, 0.1, 0.1], [1.9, 0.3, 0.1, 0.1], [8.6, 0.7, 0.3, 0.1], [9.4, 0.7, 0.3, 0.1], [7.6, 0.6, 0.3, 0.1], [3.4, 0.4, 0.2, 0.1],
]

export function spend(): Spend {
  const today = new Date()
  const first = new Date(today.getFullYear(), today.getMonth(), 1)
  const ids = ['console-assistant', 'scam-check', 'listing-read', 'search']
  const days = daily.map((d, i) => {
    const date = new Date(first)
    date.setDate(i + 1)
    return { date: date.toISOString().slice(0, 10), by_agent: Object.fromEntries(ids.map((id, j) => [id, d[j]])) }
  })
  return {
    range: 'month',
    from: first.toISOString(),
    to: today.toISOString(),
    total_usd: 142.3,
    cap_usd: budgets.monthly_cap_usd,
    projected_usd: 251,
    days,
    by_agent: [
      { agent_id: 'console-assistant', usd: 128.4, requests: 1284 },
      { agent_id: 'scam-check', usd: 8.1, requests: 18902 },
      { agent_id: 'listing-read', usd: 3.9, requests: 6410 },
      { agent_id: 'search', usd: 1.6, requests: 31277 },
      { agent_id: 'embed-text', usd: 0.3, requests: 52118 },
    ],
    by_member: [
      { member_id: 'm-lan', display_name: 'Nguyễn Thị Lan', usd: 38.2, requests: 312 },
      { member_id: 'm-minh', display_name: 'Phạm Văn Minh', usd: 31.6, requests: 268 },
      { member_id: 'm-ha', display_name: 'Lê Thu Hà', usd: 22.9, requests: 201 },
      { member_id: 'm-tu', display_name: 'Đỗ Quang Tú', usd: 17.3, requests: 164 },
    ],
  }
}

export const providerModels: Record<string, { items: ProviderModel[]; available: ProviderModel[] }> = {
  'p-anthropic': {
    items: [
      { model: 'Claude Opus 5.5', ident: 'claude-opus-5-5', tags: models[0].tags, price_in_usd: 5, price_out_usd: 25 },
      { model: 'Claude Sonnet 5.5', ident: 'claude-sonnet-5-5', tags: models[1].tags, price_in_usd: 2, price_out_usd: 10 },
      { model: 'Claude Fable 5.2', ident: 'claude-fable-5-2', tags: models[2].tags, price_in_usd: 1.5, price_out_usd: 7.5 },
      { model: 'Claude Haiku 5.5', ident: 'claude-haiku-5-5', tags: models[3].tags, price_in_usd: 1, price_out_usd: 1 },
    ],
    available: [
      { model: 'Claude Opus 5', ident: 'claude-opus-5', tags: ['Chat', 'Vision', 'Tool use', 'Reasoning'] },
      { model: 'Claude Sonnet 5', ident: 'claude-sonnet-5', tags: ['Chat', 'Vision', 'Tool use'] },
      { model: 'Claude Haiku 5', ident: 'claude-haiku-5', tags: ['Chat', 'Vision', 'Tool use'] },
    ],
  },
}

export function modelsOf(providerId: string) {
  if (!providerModels[providerId]) {
    const items = models
      .filter((m) => m.providers.includes(providerId))
      .map((m) => ({ model: m.model, ident: m.model.toLowerCase().replace(/[ .]/g, '-'), tags: m.tags, price_in_usd: m.price_in_usd, price_out_usd: m.price_out_usd }))
    providerModels[providerId] = { items, available: [] }
  }
  return providerModels[providerId]
}

// A second console agent, so a member has a choice in the picker.
agents.splice(1, 0, {
  id: 'weekly-brief', kind: 'console', name: 'Weekly brief', alias: 'weekly-brief', icon: 'article',
  purpose: 'Writes longer briefs and reports as documents', required_tags: ['Chat', 'Tool use', 'Long context', 'Reasoning'],
  model: 'Claude Opus 5.5', instructions: 'Write a brief for the period the member names, as a document with sections and charts.', instructions_version: 1,
  tools: ['ticket_get', 'account_get', 'console_actions', 'listing_get'], limits: { deadline_s: 300, max_tokens: 16000, history_turns: 10 },
  monthly_budget_usd: 50, enabled: true, updated_by: 'Trần Minh Khoa', updated_at: now, usage: { requests_7d: 42, spend_month_usd: 11.2, series: [2, 4, 3, 6, 5, 7, 6] },
})
models[0].used_by.push('weekly-brief')

export function pickable(): PickableAgent[] {
  return agents.filter((a) => a.kind === 'console' && a.enabled).map(({ id, name, icon, purpose }) => ({ id, name, icon, purpose }))
}
