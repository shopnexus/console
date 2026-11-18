import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createBrowserRouter, Navigate, Outlet } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { RequireSession } from './components/RequireSession'
import { Accounts } from './routes/Accounts'
import { Agent } from './routes/Agent'
import { DashboardOpen } from './routes/DashboardOpen'
import { Reports } from './routes/Reports'
import { SignIn } from './routes/SignIn'
import { Support } from './routes/Support'
import { AgentPage, Agents } from './routes/settings/Agents'
import { Audit } from './routes/settings/Audit'
import { Budgets } from './routes/settings/Budgets'
import { Guardrails } from './routes/settings/Guardrails'
import { Members } from './routes/settings/Members'
import { Models } from './routes/settings/Models'
import { Overview } from './routes/settings/Overview'
import { ProviderPage, Providers } from './routes/settings/Providers'
import { Tools } from './routes/settings/Tools'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } })

const router = createBrowserRouter([
  { path: '/signin', element: <SignIn /> },
  {
    element: (
      <RequireSession>
        <Outlet />
      </RequireSession>
    ),
    children: [
      { path: '/', element: <Agent /> },
      { path: '/dashboards/open', element: <DashboardOpen /> },
      { path: '/support', element: <Support /> },
      { path: '/support/:id', element: <Support /> },
      { path: '/agent', element: <Navigate to="/" replace /> },
      { path: '/agent/:id', element: <Agent /> },
      { path: '/reports', element: <Reports /> },
      { path: '/reports/:id', element: <Reports /> },
      { path: '/accounts', element: <Accounts /> },
      { path: '/accounts/:id', element: <Accounts /> },
      { path: '/settings', element: <Overview /> },
      { path: '/settings/members', element: <Members /> },
      { path: '/settings/agents', element: <Agents /> },
      { path: '/settings/agents/:id', element: <AgentPage /> },
      { path: '/settings/models', element: <Models /> },
      { path: '/settings/providers', element: <Providers /> },
      { path: '/settings/providers/:id', element: <ProviderPage /> },
      { path: '/settings/budgets', element: <Budgets /> },
      { path: '/settings/tools', element: <Tools /> },
      { path: '/settings/guardrails', element: <Guardrails /> },
      { path: '/settings/audit', element: <Audit /> },
    ],
  },
])

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
