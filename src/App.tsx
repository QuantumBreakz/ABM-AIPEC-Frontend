import { QueryClientProvider } from '@tanstack/react-query'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { Toaster } from 'sonner'
import { createQueryClient } from './api/queryClient'
import { routes } from './routes'

const queryClient = createQueryClient()
const router = createBrowserRouter(routes)

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster
        position="bottom-right"
        // Make toasts follow our light/dark design tokens
        style={
          {
            '--normal-bg': 'var(--surface)',
            '--normal-text': 'var(--foreground)',
            '--normal-border': 'var(--border)',
          } as React.CSSProperties
        }
      />
    </QueryClientProvider>
  )
}
