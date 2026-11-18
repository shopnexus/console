import type { AgentInput, AiAgent, Budgets, Provider, ProviderInput, Rotation } from '../settings'
import type { Route } from '.'
import * as db from './settings'

const S = '^/console/settings'

function provider(id: string): Provider {
  const p = db.providers.find((x) => x.id === id)
  if (!p) throw new Error(`no provider ${id}`)
  return p
}

function agent(id: string): AiAgent {
  const a = db.agents.find((x) => x.id === id)
  if (!a) throw new Error(`no agent ${id}`)
  return a
}

export const settingsRoutes: Route[] = [
  ['GET', new RegExp(`${S}/models$`), () => ({ items: db.models, tags: db.tags, synced_at: new Date(Date.now() - 40 * 60_000).toISOString() })],
  [
    'PUT',
    new RegExp(`${S}/models/([^/]+)/tags$`),
    (m, body) => {
      const model = db.models.find((x) => x.model === decodeURIComponent(m[1]))!
      model.tags = (body as { tags: string[] }).tags
      return model
    },
  ],
  ['GET', new RegExp(`${S}/providers$`), () => ({ items: [...db.providers].sort((a, b) => a.order - b.order) })],
  [
    'POST',
    new RegExp(`${S}/providers$`),
    (_, body) => {
      const b = body as ProviderInput
      const p: Provider = {
        id: `p-${Date.now()}`, name: b.name, kind: b.kind, base_url: b.base_url, key_hint: b.api_key ? `…${b.api_key.slice(-4)}` : '',
        weight: b.weight, order: b.order, enabled: b.enabled ?? true, models_mode: b.models_mode ?? 'pick', model_count: 0, status: 'healthy',
      }
      db.providers.push(p)
      return p
    },
  ],
  ['GET', new RegExp(`${S}/providers/([^/]+)$`), (m) => provider(m[1])],
  [
    'PATCH',
    new RegExp(`${S}/providers/([^/]+)$`),
    (m, body) => {
      const p = provider(m[1])
      const { api_key, ...rest } = body as Partial<ProviderInput>
      Object.assign(p, rest, api_key ? { key_hint: `…${api_key.slice(-4)}` } : {})
      return p
    },
  ],
  [
    'DELETE',
    new RegExp(`${S}/providers/([^/]+)$`),
    (m) => {
      db.providers.splice(db.providers.findIndex((x) => x.id === m[1]), 1)
      return undefined
    },
  ],
  ['POST', new RegExp(`${S}/providers/([^/]+)/test$`), (m) => (provider(m[1]).status === 'healthy' ? { ok: true, models: 7, latency_ms: 320 } : { ok: false, error: 'Invalid API key' })],
  ['GET', new RegExp(`${S}/providers/([^/]+)/models$`), (m) => db.modelsOf(m[1])],
  [
    'POST',
    new RegExp(`${S}/providers/([^/]+)/models$`),
    (m, body) => {
      const list = db.modelsOf(m[1])
      const name = (body as { model: string }).model
      const at = list.available.findIndex((x) => x.model === name)
      if (at >= 0) list.items.push(...list.available.splice(at, 1))
      provider(m[1]).model_count = list.items.length
      return list
    },
  ],
  [
    'DELETE',
    new RegExp(`${S}/providers/([^/]+)/models/([^/]+)$`),
    (m) => {
      const list = db.modelsOf(m[1])
      const at = list.items.findIndex((x) => x.model === decodeURIComponent(m[2]))
      if (at >= 0) list.available.push(...list.items.splice(at, 1))
      provider(m[1]).model_count = list.items.length
      return undefined
    },
  ],
  ['GET', new RegExp(`${S}/rotation$`), () => db.rotation],
  ['PATCH', new RegExp(`${S}/rotation$`), (_, body) => Object.assign(db.rotation, body as Partial<Rotation>)],
  ['GET', new RegExp(`${S}/agents$`), () => ({ items: db.agents })],
  [
    'POST',
    new RegExp(`${S}/agents$`),
    (_, body) => {
      const b = body as AgentInput
      const alias = (b.name ?? 'agent').toLowerCase().replace(/[^a-z0-9]+/g, '-')
      const a: AiAgent = {
        id: alias, kind: 'console', name: b.name ?? 'New agent', alias, icon: b.icon ?? 'spark', purpose: b.purpose ?? '',
        required_tags: b.required_tags ?? ['Chat', 'Tool use'], model: b.model ?? '', instructions: b.instructions ?? '', instructions_version: 1,
        tools: b.tools ?? [], limits: b.limits ?? { deadline_s: 60, max_tokens: 4096, history_turns: 20 }, monthly_budget_usd: b.monthly_budget_usd,
        enabled: b.enabled ?? true, updated_by: 'You', updated_at: new Date().toISOString(),
      }
      db.agents.push(a)
      return a
    },
  ],
  ['GET', new RegExp(`${S}/agents/([^/]+)$`), (m) => agent(m[1])],
  [
    'PATCH',
    new RegExp(`${S}/agents/([^/]+)$`),
    (m, body) => {
      const a = agent(m[1])
      const b = body as AgentInput
      if (b.instructions !== undefined && b.instructions !== a.instructions) {
        a.instructions_version += 1
        db.versions.unshift({ version: a.instructions_version, by: 'You', at: new Date().toISOString(), instructions: b.instructions })
      }
      Object.assign(a, b, { updated_at: new Date().toISOString(), updated_by: 'You' })
      return a
    },
  ],
  ['GET', new RegExp(`${S}/agents/([^/]+)/versions$`), () => ({ items: db.versions })],
  ['GET', new RegExp(`${S}/budgets$`), () => db.budgets],
  ['PATCH', new RegExp(`${S}/budgets$`), (_, body) => Object.assign(db.budgets, body as Partial<Budgets>)],
  ['GET', new RegExp(`${S}/budgets/spend$`), () => db.spend()],
  ['GET', /^\/console\/agents$/, () => ({ items: db.pickable() })],
]
