# Components

Framework: React 19 + Vite 8, React Router 8, TanStack Query 5. CSS: Tailwind v4
with the tokens in `src/styles/tokens.css` (colours, M3 type scale, corners,
springs; Tailwind's own palette and type steps are off). Icons: Material
Symbols Rounded through unplugin-icons (`~icons/material-symbols/<name>-rounded`).
No component library.

The console is new: it has no shared UI primitives yet. The only component is
the Home route below. New screens follow `DESIGN.md` and the app's design
system (`app/.superdesign/design-system.md`).

### `src/routes/Home.tsx`

```tsx
import IconShield from '~icons/material-symbols/shield-person-rounded'

export function Home() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <div className="flex items-center gap-3">
        <IconShield width={24} height={24} className="text-primary" aria-hidden />
        <h1 className="text-headline-small">ShopNexus Console</h1>
      </div>
    </main>
  )
}
```

### `src/lib/api.ts`

```ts
// The console is served from console.<domain> and the API from api.<domain>,
// so one build finds its API from the page's own host. VITE_API_URL overrides
// that for local development.
const API_URL: string =
  import.meta.env.VITE_API_URL ??
  `${location.protocol}//api.${location.host.replace(/^console\./, '')}/v1`

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/** Calls the Go server. The staff_session cookie rides along on /v1/staff. */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      accept: 'application/json',
      ...(init?.body ? { 'content-type': 'application/json' } : {}),
      ...init?.headers,
    },
  })
  if (!res.ok) {
    throw new ApiError(res.status, `${init?.method ?? 'GET'} ${path}: ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}
```
