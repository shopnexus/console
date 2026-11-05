# Routes

Config-based, React Router 8, in `src/App.tsx`.

| Path | Component | Layout |
|---|---|---|
| `/` | `src/routes/Home.tsx` | none (page title only) |

Planned: `/signin` (email, password, TOTP, first-sign-in password change and
TOTP enrolment) and `/dashboards/open?app&rd` (hands a signed-in member to an
ops dashboard with a one-time ticket).

### `src/App.tsx`

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { Home } from './routes/Home'

const queryClient = new QueryClient()

const router = createBrowserRouter([{ path: '/', element: <Home /> }])

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
```
