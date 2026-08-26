import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { PwaUpdatePrompt } from '../components/pwa/PwaUpdatePrompt'
import { ToastProvider } from '../components/ui/ToastProvider'
import { AuthProvider } from '../features/auth/AuthContext'
import { AppRouter } from './AppRouter'

export function AppProviders() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 20_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
          mutations: { retry: false },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      {/* ToastProvider acima do Router: qualquer rota emite aviso sem
          precisar receber callback por props. */}
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRouter />
            <PwaUpdatePrompt />
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  )
}
