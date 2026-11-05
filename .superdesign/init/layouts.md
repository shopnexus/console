# Layouts

No shared layout component exists yet. `DESIGN.md` prescribes the shell: an M3
navigation rail (80 px, `surfaceContainer`) on expanded, a navigation drawer
(360 px) from large up, and a 64 px top bar on `surface` with the page title in
`titleLarge`, a global search and the signed-in member. Sign-in screens have no
shell.

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

### `src/main.tsx`

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

### `index.html`

```html
<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ShopNexus Console</title>
  </head>
  <body class="bg-surface text-body-medium text-on-surface">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```
