import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, del, type Member, type Page, patch, post, put } from './api'

// Settings for admins, on /v1/console/settings/* (spec
// 2026-11-18-console-ai-synthesis-design.md, "Agents and LiteLLM"). The
// server drives LiteLLM's admin API for providers, deployments and budgets
// and keeps tags and agents in its own tables. Every change is written to
// console_actions.

export type TagKind = 'type' | 'capability'

export interface ModelTag {
  name: string
  kind: TagKind
  sort: number
}

/** A model the providers serve, with its tags. Speed and price show beside it; they are not tags. */
export interface AiModel {
  /** The model's name, as LiteLLM knows it ("Claude Sonnet 5.5"). */
  model: string
  family?: string
  tags: string[]
  /** Ids of the providers that serve it. */
  providers: string[]
  /** Dollars per million tokens, in and out; an embedding model has only in. */
  price_in_usd?: number
  price_out_usd?: number
  context_tokens?: number
  p50_ms?: number
  /** Ids of the agents whose model it is. */
  used_by: string[]
}

export interface ModelList {
  items: AiModel[]
  tags: ModelTag[]
  synced_at?: string
}

export type ProviderKind = 'openai_compatible' | 'anthropic' | 'openrouter' | 'bedrock' | 'deepinfra'

export const providerKindName: Record<ProviderKind, string> = {
  openai_compatible: 'OpenAI-compatible',
  anthropic: 'Anthropic API',
  openrouter: 'OpenRouter',
  bedrock: 'AWS Bedrock',
  deepinfra: 'DeepInfra',
}

/** A provider is a LiteLLM credential; its weight and order are written onto each of its deployments. */
export interface Provider {
  id: string
  name: string
  kind: ProviderKind
  base_url: string
  /** The key's last characters, as "sk-ant-…91cd". */
  key_hint: string
  weight: number
  order: number
  enabled: boolean
  /** pick keeps the deployments an admin added; sync lists the provider's models every 6 hours and adds new ones. */
  models_mode: 'pick' | 'sync'
  model_count: number
  status: 'healthy' | 'paused' | 'failing'
  paused_until?: string
  last_error?: string
  stats_24h?: { share_pct: number; success_pct: number; p50_ms: number; requests: number; series?: number[] }
}

export interface ProviderInput {
  name: string
  kind: ProviderKind
  base_url: string
  /** Sent only to set or change it. */
  api_key?: string
  weight: number
  order: number
  enabled?: boolean
  models_mode?: 'pick' | 'sync'
}

export interface ProviderModel {
  model: string
  /** The provider's own id for it ("claude-sonnet-5-5"). */
  ident: string
  tags: string[]
  price_in_usd?: number
  price_out_usd?: number
}

export interface ProviderModels {
  items: ProviderModel[]
  /** The provider's models not added yet. */
  available: ProviderModel[]
}

export interface ProviderTest {
  ok: boolean
  models?: number
  latency_ms?: number
  error?: string
}

/** LiteLLM's router settings. weighted and even are simple-shuffle; fallback is order-based. */
export interface Rotation {
  strategy: 'weighted' | 'even' | 'fallback'
  num_retries: number
  allowed_fails: number
  cooldown_s: number
  timeout_s: number
}

export interface AgentLimits {
  deadline_s: number
  max_tokens: number
  history_turns: number
}

/** App agents are called by server's code and only edited; console agents run in the agent service and are created here. */
export interface AiAgent {
  id: string
  kind: 'app' | 'console'
  name: string
  /** The name on the wire to LiteLLM only ("console-agent"). */
  alias: string
  icon: string
  purpose: string
  required_tags: string[]
  model: string
  instructions: string
  instructions_version: number
  tools: string[]
  limits: AgentLimits
  monthly_budget_usd?: number
  enabled: boolean
  updated_by?: string
  updated_at: string
  usage?: { requests_7d: number; spend_month_usd: number; series?: number[] }
}

export type AgentInput = Partial<Omit<AiAgent, 'id' | 'kind' | 'alias' | 'instructions_version' | 'updated_by' | 'updated_at' | 'usage'>>

export interface AgentVersion {
  version: number
  by: string
  at: string
  instructions: string
}

export interface Budgets {
  monthly_cap_usd: number
  alert_pct: number
  /** What happens at the cap: console agents stop and the app's agents keep running, or every agent stops. */
  on_cap: 'stop_console' | 'stop_all'
  member_daily_usd: { moderator: number; admin: number }
  overrides: { member_id: string; display_name: string; daily_usd: number }[]
}

export type SpendRange = 'month' | '7d' | '30d'

export interface Spend {
  range: SpendRange
  from: string
  to: string
  total_usd: number
  cap_usd: number
  projected_usd?: number
  days: { date: string; by_agent: Record<string, number> }[]
  by_agent: { agent_id: string; usd: number; requests: number }[]
  by_member: { member_id: string; display_name: string; usd: number; requests: number }[]
}

/** A console agent a member may pick in the ask box. */
export interface PickableAgent {
  id: string
  name: string
  icon: string
  purpose: string
}

const S = '/console/settings'
const key = (...k: string[]) => ['settings', ...k]

export function useModels() {
  return useQuery({ queryKey: key('models'), queryFn: () => api<ModelList>(`${S}/models`) })
}

export function useProviders() {
  return useQuery({ queryKey: key('providers'), queryFn: () => api<Page<Provider>>(`${S}/providers`) })
}

export function useProvider(id: string | undefined) {
  return useQuery({ queryKey: key('provider', id ?? ''), enabled: !!id, queryFn: () => api<Provider>(`${S}/providers/${id}`) })
}

export function useProviderModels(id: string | undefined) {
  return useQuery({ queryKey: key('provider-models', id ?? ''), enabled: !!id, queryFn: () => api<ProviderModels>(`${S}/providers/${id}/models`) })
}

export function useRotation() {
  return useQuery({ queryKey: key('rotation'), queryFn: () => api<Rotation>(`${S}/rotation`) })
}

export function useAgents() {
  return useQuery({ queryKey: key('agents'), queryFn: () => api<Page<AiAgent>>(`${S}/agents`) })
}

export function useAgent(id: string | undefined) {
  return useQuery({ queryKey: key('agent', id ?? ''), enabled: !!id, queryFn: () => api<AiAgent>(`${S}/agents/${id}`) })
}

export function useAgentVersions(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: key('agent-versions', id ?? ''),
    enabled: !!id && enabled,
    queryFn: () => api<Page<AgentVersion>>(`${S}/agents/${id}/versions`),
  })
}

export function useBudgets() {
  return useQuery({ queryKey: key('budgets'), queryFn: () => api<Budgets>(`${S}/budgets`) })
}

export function useSpend(range: SpendRange) {
  return useQuery({ queryKey: key('spend', range), queryFn: () => api<Spend>(`${S}/budgets/spend?range=${range}`) })
}

/** The console agents the signed-in member may pick; every member can read it. */
export function usePickableAgents() {
  return useQuery({ queryKey: ['agents', 'pickable'], queryFn: () => api<Page<PickableAgent>>('/console/agents'), staleTime: 60_000 })
}

/** A write whose answer reads every query under prefix again. */
function useCommand<A, R>(prefix: string[], fn: (a: A) => Promise<R>) {
  const client = useQueryClient()
  return useMutation({ mutationFn: fn, onSettled: () => client.invalidateQueries({ queryKey: prefix }) })
}

/** Writes on settings; each reads every settings query again when it lands. */
export function useSettingsCommands() {
  const m = <A, R>(fn: (a: A) => Promise<R>) => fn
  const settings = ['settings']
  const fns = {
    createProvider: m((p: ProviderInput) => post<Provider>(`${S}/providers`, p)),
    updateProvider: m(({ id, ...p }: Partial<ProviderInput> & { id: string }) => patch<Provider>(`${S}/providers/${id}`, p)),
    deleteProvider: m((id: string) => del(`${S}/providers/${id}`)),
    testProvider: m((id: string) => post<ProviderTest>(`${S}/providers/${id}/test`)),
    addProviderModel: m(({ id, model }: { id: string; model: string }) => post<ProviderModels>(`${S}/providers/${id}/models`, { model })),
    removeProviderModel: m(({ id, model }: { id: string; model: string }) => del(`${S}/providers/${id}/models/${encodeURIComponent(model)}`)),
    setModelTags: m(({ model, tags }: { model: string; tags: string[] }) => put<AiModel>(`${S}/models/${encodeURIComponent(model)}/tags`, { tags })),
    createAgent: m((a: AgentInput) => post<AiAgent>(`${S}/agents`, a)),
    updateAgent: m(({ id, ...a }: AgentInput & { id: string }) => patch<AiAgent>(`${S}/agents/${id}`, a)),
    updateRotation: m((r: Partial<Rotation>) => patch<Rotation>(`${S}/rotation`, r)),
    updateBudgets: m((b: Partial<Budgets>) => patch<Budgets>(`${S}/budgets`, b)),
  }
  return {
    createProvider: useCommand(settings, fns.createProvider),
    updateProvider: useCommand(settings, fns.updateProvider),
    deleteProvider: useCommand(settings, fns.deleteProvider),
    testProvider: useCommand(settings, fns.testProvider),
    addProviderModel: useCommand(settings, fns.addProviderModel),
    removeProviderModel: useCommand(settings, fns.removeProviderModel),
    setModelTags: useCommand(settings, fns.setModelTags),
    createAgent: useCommand(settings, fns.createAgent),
    updateAgent: useCommand(settings, fns.updateAgent),
    updateRotation: useCommand(settings, fns.updateRotation),
    updateBudgets: useCommand(settings, fns.updateBudgets),
  }
}

/** Models that carry every required tag; the rest are counted as hidden. */
export function modelsFor(models: AiModel[], required: string[]): { fit: AiModel[]; hidden: number } {
  const fit = models.filter((m) => required.every((t) => m.tags.includes(t)))
  return { fit, hidden: models.length - fit.length }
}

/** Members, newest first; the endpoint exists today. */
export function useMembers() {
  return useQuery({ queryKey: ['console', 'members', 'all'], queryFn: () => api<Page<Member>>('/console/members?limit=100') })
}

export function useMemberCommands() {
  const members = ['console', 'members']
  return {
    create: useCommand(members, (b: { email: string; display_name: string }) =>
      post<{ member: Member; temporary_password: string }>('/console/members', b),
    ),
    disable: useCommand(members, (id: string) => post<Member>(`/console/members/${id}/disable`)),
    enable: useCommand(members, (id: string) => post<Member>(`/console/members/${id}/enable`)),
    unlock: useCommand(members, (id: string) => post<Member>(`/console/members/${id}/unlock`)),
    resetPassword: useCommand(members, (id: string) => post<{ temporary_password: string }>(`/console/members/${id}/reset-password`)),
  }
}
