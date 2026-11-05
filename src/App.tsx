import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createBrowserRouter, Outlet, RouterProvider } from 'react-router'
import { RequireSession } from './components/RequireSession'
import { DashboardOpen } from './routes/DashboardOpen'
import { Home } from './routes/Home'
import { SignIn } from './routes/SignIn'

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
      { path: '/', element: <Home /> },
      { path: '/dashboards/open', element: <DashboardOpen /> },
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
