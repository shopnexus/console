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
