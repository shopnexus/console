import type { AgentNew, AgentPatch, AiAgent, BudgetsPatch, Provider, ProviderNew, ProviderPatch, RotationPatch, SpendRange } from '../settings'
import { MockError, type Route } from '.'
import * as db from './settings'

// The routes of api/paths/ai_settings.yaml, with the server's refusals.

const S = '^/console/settings'

function provider(id: string): Provider {
  const p = db.providers.find((x) => x.id === id)
  if (!p) throw new MockError(404, 'ai_provider_not_found')
  return p
}

function agent(id: string): AiAgent {
  const a = db.agents.find((x) => x.id === id)
  if (!a) throw new MockError(404, 'ai_agent_not_found')
  return a
}

export const settingsRoutes: Route[] = [
  ['GET', new RegExp(`${S}/models$`), () => ({ items: db.models(), tags: db.tags })],
  [
    'PUT',
    new RegExp(`${S}/models/tags$`),
    (_, body) => {
      const b = body as { model: string; tags: string[] }
      if (!db.models().some((m) => m.model === b.model)) throw new MockError(404, 'ai_model_not_found')
      return db.setTags(b.model, b.tags)
    },
  ],
  ['GET', new RegExp(`${S}/providers/health$`), () => ({ items: db.health.filter((h) => db.providers.some((p) => p.id === h.id)) })],
  ['GET', new RegExp(`${S}/providers/([^/]+)/models$`), (m) => (provider(m[1]), db.providerOptions(m[1]))],
  ['GET', new RegExp(`${S}/agents/usage$`), (_, __, q) => db.agentUsage((q.get('range') as SpendRange | null) ?? '7d')],
  ['GET', new RegExp(`${S}/tools$`), (_, __, q) => db.toolsUsage((q.get('range') as SpendRange | null) ?? '7d')],
  ['GET', new RegExp(`${S}/guardrails$`), (_, __, q) => db.guardrails((q.get('range') as SpendRange | null) ?? '7d')],
  ['GET', new RegExp(`${S}/dashboards$`), () => ({ items: db.dashboards })],
  [
    'PATCH',
    new RegExp(`${S}/dashboards$`),
    (_, body) => {
      for (const d of (body as { items: { app: string; floor: 'moderator' | 'admin' }[] }).items) {
        const x = db.dashboards.find((y) => y.app === d.app)
        if (x) x.floor = d.floor
      }
      return { items: db.dashboards }
    },
  ],
  ['GET', new RegExp(`${S}/providers$`), () => ({ items: [...db.providers].sort((a, b) => a.order - b.order || b.weight - a.weight) })],
  [
    'POST',
    new RegExp(`${S}/providers$`),
    (_, body) => {
      const b = body as ProviderNew
      if (db.providers.some((p) => p.id === b.id)) throw new MockError(409, 'ai_provider_exists')
      const p: Provider = {
        id: b.id, name: b.name ?? b.id, kind: b.kind, base_url: b.base_url, key_hint: `${b.api_key.slice(0, 3)}…${b.api_key.slice(-4)}`,
        weight: b.weight ?? 1, order: b.order ?? 1, mode: b.mode ?? 'pick', models: [], enabled: true,
      }
      db.providers.push(p)
      return p
    },
  ],
  [
    'PATCH',
    new RegExp(`${S}/providers/([^/]+)$`),
    (m, body) => {
      const p = provider(m[1])
      const { api_key, ...rest } = body as ProviderPatch
      Object.assign(p, rest, api_key ? { key_hint: `${api_key.slice(0, 3)}…${api_key.slice(-4)}` } : {})
      return p
    },
  ],
  [
    'DELETE',
    new RegExp(`${S}/providers/([^/]+)$`),
    (m) => {
      const p = provider(m[1])
      if (db.agents.some((a) => p.models.includes(a.model) && !db.providers.some((o) => o !== p && o.models.includes(a.model)))) throw new MockError(409, 'ai_provider_in_use')
      db.providers.splice(db.providers.indexOf(p), 1)
      return undefined
    },
  ],
  [
    'POST',
    new RegExp(`${S}/providers/([^/]+)/test$`),
    (m, body) => {
      const p = provider(m[1])
      const model = (body as { model?: string } | undefined)?.model ?? p.models[0]
      return p.id === 'aws-bedrock' ? { ok: false, model, error: 'AuthenticationError: invalid credentials', latency_ms: 210 } : { ok: true, model, latency_ms: 320 }
    },
  ],
  [
    'POST',
    new RegExp(`${S}/providers/([^/]+)/models$`),
    (m, body) => {
      const p = provider(m[1])
      const model = (body as { model: string }).model
      if (!p.models.includes(model)) p.models.push(model)
      if (!db.models().some((x) => x.model === model)) db.setTags(model, db.providerOptions(p.id).items.find((o) => o.model === model)?.tags ?? [])
      return p
    },
  ],
  [
    'DELETE',
    new RegExp(`${S}/providers/([^/]+)/models$`),
    (m, _, q) => {
      const p = provider(m[1])
      p.models = p.models.filter((x) => x !== q.get('model'))
      return p
    },
  ],
  ['GET', new RegExp(`${S}/rotation$`), () => db.rotation],
  ['PATCH', new RegExp(`${S}/rotation$`), (_, body) => Object.assign(db.rotation, body as RotationPatch)],
  ['GET', new RegExp(`${S}/agents$`), () => ({ items: db.agents })],
  [
    'POST',
    new RegExp(`${S}/agents$`),
    (_, body) => {
      const b = body as AgentNew
      const a: AiAgent = {
        id: crypto.randomUUID(), kind: 'console', name: b.name, alias: b.alias, icon: b.icon ?? 'spark', purpose: b.purpose ?? '',
        required_tags: b.required_tags ?? [], model: b.model, instructions: b.instructions ?? '', instructions_version: 1, tools: b.tools ?? [],
        limits: b.limits ?? {}, monthly_budget_usd: b.monthly_budget_usd, enabled: b.enabled ?? true, updated_by: db.ids.khoa, updated_at: new Date().toISOString(),
      }
      db.agents.push(a)
      return a
    },
  ],
  [
    'PATCH',
    new RegExp(`${S}/agents/([^/]+)$`),
    (m, body) => {
      const a = agent(m[1])
      const b = body as AgentPatch
      if (a.kind === 'app' && Object.keys(b).some((k) => !['model', 'limits', 'monthly_budget_usd'].includes(k))) throw new MockError(422, 'ai_agent_app_fixed')
      if (b.instructions !== undefined && b.instructions !== a.instructions) {
        a.instructions_version += 1
        db.versions.unshift({ version: a.instructions_version, instructions: b.instructions, created_by: db.ids.khoa, created_at: new Date().toISOString() })
      }
      const { monthly_budget_usd, ...rest } = b
      Object.assign(a, rest, { updated_at: new Date().toISOString(), updated_by: db.ids.khoa })
      if (monthly_budget_usd !== undefined) a.monthly_budget_usd = monthly_budget_usd ?? undefined
      return a
    },
  ],
  ['GET', new RegExp(`${S}/agents/([^/]+)/versions$`), (m) => ({ items: agent(m[1]).id === db.ids.console ? db.versions : [] })],
  ['GET', new RegExp(`${S}/budgets$`), () => db.budgets()],
  [
    'PATCH',
    new RegExp(`${S}/budgets$`),
    (_, body) => {
      const b = body as BudgetsPatch
      for (const x of b.agents ?? []) agent(x.agent_id).monthly_budget_usd = x.monthly_budget_usd ?? undefined
      if (b.member_daily_usd !== undefined) db.budgetState.member_daily_usd = b.member_daily_usd ?? undefined
      if (b.monthly_cap_usd !== undefined) db.budgetState.monthly_cap_usd = b.monthly_cap_usd ?? undefined
      if (b.alert_pct !== undefined) db.budgetState.alert_pct = b.alert_pct
      if (b.on_cap !== undefined) db.budgetState.on_cap = b.on_cap
      if (b.overrides !== undefined) db.budgetState.overrides = b.overrides
      return db.budgets()
    },
  ],
  ['GET', new RegExp(`${S}/spend$`), (_, __, q) => db.spend((q.get('range') as SpendRange | null) ?? '30d')],
  ['GET', /^\/console\/agents$/, () => ({ items: db.pickable() })],
]
