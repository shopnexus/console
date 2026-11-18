import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, del, type Member, type Page, patch, post, put } from './api'

// Settings for admins, on /v1/console/settings/* (server
// api/paths/ai_settings.yaml, schemas/ai_settings.yaml). The server drives
// LiteLLM's admin API for providers, deployments, rotation and budgets and
// keeps tags and agents in its own tables. Every change is written to
// console_actions.

export type TagKind = 'type' | 'capability'

/** AITag. */
export interface ModelTag {
  name: string
  kind: TagKind
}

/** AINamed and AIAgentRef. */
export interface Named {
  id: string
  name: string
}

/** AIModel: a model the providers serve, with its tags. Price shows beside it; it is no tag. */
export interface AiModel {
  /** The model's id, which may hold a slash (baai/bge-m3): it never goes into a path. */
  model: string
  tags: string[]
  providers: Named[]
  /** The agents that run on it. */
  agents: Named[]
  input_cost_per_mtok?: number
  output_cost_per_mtok?: number
  context_tokens?: number
}

/** AIModelList: the models, and every tag in order. */
export interface ModelList {
  items: AiModel[]
  tags: ModelTag[]
}

export type ProviderMode = 'pick' | 'sync'

/** AIProvider: a LiteLLM credential; each of its models is a deployment with the provider's weight and order. */
export interface Provider {
  /** The LiteLLM credential name. */
  id: string
  name: string
  /** LiteLLM's provider route, such as openai, anthropic or openrouter. */
  kind: string
  base_url?: string
  /** The key as LiteLLM shows it, masked. */
  key_hint?: string
  weight: number
  /** Lower is tried first; a higher order is the fallback. */
  order: number
  /** pick keeps the models an admin added; sync lists the provider's models every 6 hours and adds new ones. */
  mode: ProviderMode
  models: string[]
  synced_at?: string
  /** Off takes the provider's deployments out of rotation. */
  enabled: boolean
}

/** One of a provider's models as the provider lists them; added says it is a deployment already. */
export interface ProviderModelOption {
  model: string
  tags?: string[]
  input_cost_per_mtok?: number
  output_cost_per_mtok?: number
  context_tokens?: number
  added: boolean
}

/** A provider's last 24 hours, from LiteLLM. */
export interface ProviderHealth {
  id: string
  requests_24h: number
  share_pct: number
  success_pct: number
  p50_ms: number
  cooling_until?: string
  last_error?: string
}

/** AIProviderNew. */
export interface ProviderNew {
  id: string
  name?: string
  kind: string
  base_url?: string
  api_key: string
  weight?: number
  order?: number
  mode?: ProviderMode
}

/** AIProviderPatch. */
export type ProviderPatch = Partial<Pick<ProviderNew, 'name' | 'base_url' | 'api_key' | 'weight' | 'order' | 'mode'>> & { enabled?: boolean }

/** LiteLLM's provider routes the console names; the server takes any route. */
export const providerKinds: Record<string, string> = {
  openai: 'OpenAI-compatible',
  anthropic: 'Anthropic',
  openrouter: 'OpenRouter',
  bedrock: 'AWS Bedrock',
  deepinfra: 'DeepInfra',
  gemini: 'Google Gemini',
}

export const kindName = (kind: string) => providerKinds[kind] ?? kind

/** AIProviderTest. */
export interface ProviderTest {
  ok: boolean
  model?: string
  error?: string
  latency_ms: number
}

/** AIRoutingStrategy. Fallback by order holds under every strategy. */
export type RoutingStrategy = 'simple-shuffle' | 'least-busy' | 'latency-based-routing' | 'usage-based-routing-v2'

export const strategyName: Record<string, string> = {
  'simple-shuffle': 'By weight',
  'least-busy': 'Least busy',
  'latency-based-routing': 'Fastest',
  'usage-based-routing-v2': 'By usage',
}

/** AIRotation: LiteLLM's router settings. */
export interface Rotation {
  routing_strategy: string
  num_retries: number
  /** Failures in a minute before a deployment cools down. */
  allowed_fails: number
  cooldown_s: number
  timeout_s: number
}

export type RotationPatch = Partial<Omit<Rotation, 'routing_strategy'> & { routing_strategy: RoutingStrategy }>

/** AIAgentLimits; a field left out takes the agent service's default. timeout_s is an app agent's call limit. */
export interface AgentLimits {
  deadline_s?: number
  max_model_calls?: number
  context_window?: number
  tool_timeout_s?: number
  tool_attempts?: number
  max_tokens?: number
  timeout_s?: number
}

/** AIAgent. App agents are called by server's code and only their model, limits and budget change; console agents are created here. */
export interface AiAgent {
  id: string
  kind: 'app' | 'console'
  name: string
  /** The model name sent to LiteLLM; shown nowhere else. */
  alias: string
  icon: string
  purpose: string
  required_tags: string[]
  model: string
  instructions?: string
  instructions_version: number
  tools: string[]
  limits: AgentLimits
  monthly_budget_usd?: number
  enabled: boolean
  updated_by?: string
  updated_at: string
}

/** AIAgentNew. */
export interface AgentNew {
  name: string
  alias: string
  model: string
  icon?: string
  purpose?: string
  required_tags?: string[]
  instructions?: string
  tools?: string[]
  limits?: AgentLimits
  monthly_budget_usd?: number
  enabled?: boolean
}

/** AIAgentPatch; an app agent takes model, limits and monthly_budget_usd only. null takes the budget away. */
export type AgentPatch = Partial<Omit<AgentNew, 'alias' | 'monthly_budget_usd'>> & { monthly_budget_usd?: number | null }

/** AIAgentVersion. */
export interface AgentVersion {
  version: number
  instructions: string
  created_by?: string
  created_at: string
}

/** AIAgentBudget. */
export interface AgentBudget {
  agent_id: string
  name: string
  kind: 'app' | 'console'
  monthly_budget_usd?: number
  /** Spent in the budget's current period, as LiteLLM counts it. */
  spent_usd: number
}

export type OnCap = 'stop_agents' | 'alert_only'

export interface MemberDaily {
  moderator: number
  admin: number
}

/** AIBudgets. */
export interface Budgets {
  agents: AgentBudget[]
  /** The month's cap over every agent, the share that alerts, and what happens at the cap. */
  monthly_cap_usd?: number
  alert_pct?: number
  on_cap?: OnCap
  /** The month's spend so far, against monthly_cap_usd. */
  month_spent_usd?: number
  /** The month's spend has passed the alert share. */
  alerting?: boolean
  /** The month's spend has reached the cap; with on_cap stop_agents, console turns are refused. */
  capped?: boolean
  /** What each member may spend a day through the console agents, by role, with overrides by member. */
  member_daily_usd?: MemberDaily
  overrides?: { member_id: string; daily_usd: number }[]
}

/** AIBudgetsPatch. */
export interface BudgetsPatch {
  agents?: { agent_id: string; monthly_budget_usd: number | null }[]
  monthly_cap_usd?: number | null
  alert_pct?: number
  on_cap?: OnCap
  member_daily_usd?: MemberDaily | null
  overrides?: { member_id: string; daily_usd: number }[]
}

export type SpendRange = '7d' | '30d' | '90d'

/** AISpend: LiteLLM's spend by day, in all and by agent, over a range ending today. */
export interface Spend {
  range: SpendRange
  start: string
  end: string
  total_usd: number
  days: { date: string; total_usd: number; agents: { agent_id: string; usd: number }[] }[]
  /** Spend and questions by member over the range. */
  members?: { member_id: string; display_name: string; usd: number; requests: number }[]
}

/** Requests per agent over a range, by day. */
export interface AgentUsage {
  agent_id: string
  requests: number
  days: { date: string; requests: number }[]
}

/** Calls per tool over a range, and the latest calls. */
export interface ToolsUsage {
  items: { name: string; display_name?: string; calls: number; failed: number; p50_ms: number; days: { date: string; calls: number }[] }[]
  recent: { call_id: string; turn_id: string; member_id: string; tool: string; label: string; duration_ms: number; status: 'running' | 'success' | 'failed' | 'skipped'; at: string }[]
}

/** An ops dashboard and the lowest role that opens it. */
export interface DashboardFloor {
  app: string
  name: string
  floor: 'moderator' | 'admin'
}

/** Guardrail blocks per rule over a range, and the latest ones. */
export interface GuardrailStats {
  items: { rule: string; count: number }[]
  recent: { rule: string; detail: string; member_id: string; turn_id: string; at: string }[]
}

/** ConsoleAgent: a console agent a member may pick in the ask box. */
export interface PickableAgent {
  id: string
  name: string
  icon: string
  purpose: string
  /** The agent a question goes to when it names none. */
  default: boolean
}

const S = '/console/settings'
const key = (...k: string[]) => ['settings', ...k]

export function useModels() {
  return useQuery({ queryKey: key('models'), queryFn: () => api<ModelList>(`${S}/models`) })
}

export function useProviders() {
  return useQuery({ queryKey: key('providers'), queryFn: () => api<Page<Provider>>(`${S}/providers`) })
}

/** One provider, from the list: the server has no GET for one. */
export function useProvider(id: string | undefined) {
  const list = useProviders()
  return { ...list, data: id ? list.data?.items.find((p) => p.id === id) : undefined, missing: !!list.data && !list.data.items.some((p) => p.id === id) }
}

/** A provider's models as the provider lists them, added or not. */
export function useProviderModels(id: string | undefined) {
  return useQuery({ queryKey: key('provider-models', id ?? ''), enabled: !!id, queryFn: () => api<Page<ProviderModelOption>>(`${S}/providers/${id}/models`) })
}

export function useProviderHealth() {
  return useQuery({ queryKey: key('provider-health'), queryFn: () => api<Page<ProviderHealth>>(`${S}/providers/health`), refetchInterval: 60_000 })
}

export function useAgentUsage(range: SpendRange) {
  return useQuery({ queryKey: key('agent-usage', range), queryFn: () => api<Page<AgentUsage>>(`${S}/agents/usage?range=${range}`) })
}

export function useToolsUsage(range: SpendRange) {
  return useQuery({ queryKey: key('tools', range), queryFn: () => api<ToolsUsage>(`${S}/tools?range=${range}`) })
}

/** The dashboards' floors; only admins read them, so off for anyone else. */
export function useDashboards(enabled = true) {
  return useQuery({ queryKey: key('dashboards'), enabled, queryFn: () => api<Page<DashboardFloor>>(`${S}/dashboards`), staleTime: 60_000 })
}

export function useGuardrails(range: SpendRange) {
  return useQuery({ queryKey: key('guardrails', range), queryFn: () => api<GuardrailStats>(`${S}/guardrails?range=${range}`) })
}

export function useRotation() {
  return useQuery({ queryKey: key('rotation'), queryFn: () => api<Rotation>(`${S}/rotation`) })
}

export function useAgents() {
  return useQuery({ queryKey: key('agents'), queryFn: () => api<Page<AiAgent>>(`${S}/agents`) })
}

/** One agent, from the list: the server has no GET for one. */
export function useAgent(id: string | undefined) {
  const list = useAgents()
  return { ...list, data: id ? list.data?.items.find((a) => a.id === id) : undefined, missing: !!list.data && !list.data.items.some((a) => a.id === id) }
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
  return useQuery({ queryKey: key('spend', range), queryFn: () => api<Spend>(`${S}/spend?range=${range}`) })
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
  const settings = ['settings']
  return {
    createProvider: useCommand(settings, (p: ProviderNew) => post<Provider>(`${S}/providers`, p)),
    updateProvider: useCommand(settings, ({ id, ...p }: ProviderPatch & { id: string }) => patch<Provider>(`${S}/providers/${id}`, p)),
    deleteProvider: useCommand(settings, (id: string) => del(`${S}/providers/${id}`)),
    testProvider: useCommand(settings, ({ id, model }: { id: string; model?: string }) => post<ProviderTest>(`${S}/providers/${id}/test`, model ? { model } : {})),
    addProviderModel: useCommand(
      settings,
      ({ id, ...m }: { id: string; model: string; input_cost_per_mtok?: number; output_cost_per_mtok?: number }) => post<Provider>(`${S}/providers/${id}/models`, m),
    ),
    removeProviderModel: useCommand(settings, ({ id, model }: { id: string; model: string }) =>
      api<Provider>(`${S}/providers/${id}/models?${new URLSearchParams({ model })}`, { method: 'DELETE' }),
    ),
    setModelTags: useCommand(settings, (b: { model: string; tags: string[] }) => put<{ model: string; tags: string[] }>(`${S}/models/tags`, b)),
    createAgent: useCommand(settings, (a: AgentNew) => post<AiAgent>(`${S}/agents`, a)),
    updateAgent: useCommand(settings, ({ id, ...a }: AgentPatch & { id: string }) => patch<AiAgent>(`${S}/agents/${id}`, a)),
    updateRotation: useCommand(settings, (r: RotationPatch) => patch<Rotation>(`${S}/rotation`, r)),
    updateBudgets: useCommand(settings, (b: BudgetsPatch) => patch<Budgets>(`${S}/budgets`, b)),
    updateDashboard: useCommand(settings, (d: { app: string; floor: 'moderator' | 'admin' }) => patch<Page<DashboardFloor>>(`${S}/dashboards`, { items: [d] })),
  }
}

/** Models that carry every required tag; the rest are counted as hidden. */
export function modelsFor(models: AiModel[], required: string[]): { fit: AiModel[]; hidden: number } {
  const fit = models.filter((m) => required.every((t) => m.tags.includes(t)))
  return { fit, hidden: models.length - fit.length }
}

/** An alias for a new agent from its name: lower-case ASCII words joined by hyphens. */
export function aliasOf(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63)
}

/** What an admin reads when a settings write fails, by the server's error code. */
export function settingsFailure(code: string | undefined): string {
  switch (code) {
    case 'ai_provider_exists':
      return 'A provider with that id exists.'
    case 'ai_provider_in_use':
      return 'An agent still runs on this provider.'
    case 'ai_provider_not_found':
      return 'There is no such provider.'
    case 'ai_model_not_found':
      return 'No provider serves that model.'
    case 'ai_agent_app_fixed':
      return "An app agent's name, tools and instructions are set in code."
    case 'ai_agent_not_found':
      return 'There is no such agent.'
    case 'ai_gateway_refused':
      return 'LiteLLM refused the change.'
    case 'ai_gateway_unavailable':
      return 'LiteLLM is unavailable. Try again later.'
    case 'member_not_found':
      return 'There is no such member.'
    case 'bad_request':
      return 'Some field is not valid.'
    case 'forbidden':
    case 'console_forbidden':
      return 'Admins only.'
    default:
      return 'That did not save.'
  }
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
