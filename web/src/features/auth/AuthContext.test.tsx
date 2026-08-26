import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { AuthProvider } from './AuthContext'
import { useAuth } from './auth-context'
import type { AuthSession } from './auth.types'

const ana: AuthSession = {
  token: 'token-ana',
  usuario: {
    id: 'enfermeiro-ana',
    nome: 'Ana Ferreira',
    email: 'ana.ferreira@pad.local',
    papel: 'ENFERMEIRO',
  },
}

const bruno: AuthSession = {
  token: 'token-bruno',
  usuario: {
    id: 'enfermeiro-bruno',
    nome: 'Bruno Castro',
    email: 'bruno.castro@pad.local',
    papel: 'ENFERMEIRO',
  },
}

function CacheProbe() {
  const { signIn, signOut } = useAuth()
  const queryClient = useQueryClient()

  return (
    <div>
      <span data-testid="cache-size">
        {queryClient.getQueryCache().getAll().length}
      </span>
      <button type="button" onClick={() => signIn(ana)}>
        Entrar Ana
      </button>
      <button type="button" onClick={() => signIn(bruno)}>
        Entrar Bruno
      </button>
      <button type="button" onClick={() => signOut()}>
        Sair
      </button>
    </div>
  )
}

function renderAuth(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CacheProbe />
      </AuthProvider>
    </QueryClientProvider>,
  )
}

describe('AuthProvider — isolamento de cache', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })
  it('esvazia o cache clínico ao trocar de profissional na mesma aba', async () => {
    const user = userEvent.setup()
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    queryClient.setQueryData(['queue', { periodo: 'hoje' }], {
      itens: [{ paciente: { nome: 'Paciente da Ana' } }],
      atendimentoAtivo: { paciente: { nome: 'Paciente da Ana' } },
    })
    queryClient.setQueryData(['patient', 'paciente-1'], {
      nome: 'Paciente da Ana',
    })

    renderAuth(queryClient)
    expect(screen.getByTestId('cache-size')).toHaveTextContent('2')

    await user.click(screen.getByRole('button', { name: 'Entrar Bruno' }))

    expect(screen.getByTestId('cache-size')).toHaveTextContent('0')
    expect(queryClient.getQueryData(['queue', { periodo: 'hoje' }])).toBeUndefined()
    expect(queryClient.getQueryData(['patient', 'paciente-1'])).toBeUndefined()
  })

  it('esvazia o cache ao encerrar a sessão', async () => {
    const user = userEvent.setup()
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    sessionStorage.setItem('pad.session', JSON.stringify(ana))
    queryClient.setQueryData(['patients', ''], { itens: [{ nome: 'Paciente da Ana' }] })

    renderAuth(queryClient)
    expect(screen.getByTestId('cache-size')).toHaveTextContent('1')

    await user.click(screen.getByRole('button', { name: 'Sair' }))

    expect(screen.getByTestId('cache-size')).toHaveTextContent('0')
    expect(sessionStorage.getItem('pad.session')).toBeNull()
  })
})
