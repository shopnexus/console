// Fixtures for the AI, settings and commerce paths, behind VITE_MOCK_AI=1, to
// work without the agent and LiteLLM. api() asks here first and goes to the
// server on unmocked.
// Settings come from ./settings, the agent's chats and runs from ./agent.

import { agentRoutes } from './agent'
import { commerceRoutes } from './commerce'
import { settingsRoutes } from './settings-routes'

export const unmocked = Symbol('unmocked')

export type Handler = (match: RegExpMatchArray, body: unknown, query: URLSearchParams) => unknown

export type Route = [method: string, pattern: RegExp, handler: Handler]

const routes: Route[] = [...settingsRoutes, ...agentRoutes, ...commerceRoutes]

/** A short wait, so pending states show as they would against the server. */
const settle = () => new Promise((r) => setTimeout(r, 120))

export async function mockApi(method: string, path: string, body: unknown): Promise<unknown> {
  const [bare, qs] = path.split('?')
  for (const [m, re, handle] of routes) {
    if (m !== method) continue
    const match = bare.match(re)
    if (match) {
      await settle()
      return handle(match, body, new URLSearchParams(qs))
    }
  }
  return unmocked
}

/** An answer the server would refuse, in its error shape. */
export class MockError extends Error {
  readonly status: number
  readonly code: string
  constructor(status: number, code: string) {
    super(code)
    this.status = status
    this.code = code
  }
}
