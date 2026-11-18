// Fixtures for the AI paths the server does not serve yet, behind
// VITE_MOCK_AI=1. api() asks here first and goes to the server on unmocked.

export const unmocked = Symbol('unmocked')

export async function mockApi(method: string, path: string, body: unknown): Promise<unknown> {
  void method
  void path
  void body
  return unmocked
}
