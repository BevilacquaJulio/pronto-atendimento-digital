import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../../auth/auth-context'
import { listPatients } from '../pacientes.api'
import { PatientsPage } from './PatientsPage'

vi.mock('../pacientes.api', () => ({
  listPatients: vi.fn(),
}))

const mockedListPatients = vi.mocked(listPatients)

const auth: AuthContextValue = {
  user: {
    id: 'enfermeiro-1',
    nome: 'Ana Ferreira',
    email: 'ana.ferreira@pad.local',
    papel: 'ENFERMEIRO',
  },
  token: 'token-teste',
  signIn: vi.fn(),
  signOut: vi.fn(),
}

function renderPatients() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={auth}>
        <MemoryRouter initialEntries={['/pacientes']}>
          <Routes>
            <Route path="/pacientes" element={<PatientsPage />} />
            <Route
              path="/pacientes/:id"
              element={<p>Detalhes carregados</p>}
            />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

describe('PatientsPage', () => {
  beforeEach(() => {
    mockedListPatients.mockReset().mockResolvedValue({
      itens: [
        {
          id: 'paciente-1',
          nome: 'Maria da Silva',
          cpf: '12345678901',
          contato: '(11) 99999-9999',
          nascimento: '1990-01-15T00:00:00.000Z',
          _count: { atendimentos: 2 },
        },
      ],
      total: 1,
      pagina: 1,
      porPagina: 12,
      paginas: 1,
    })
  })

  it('lista os dados do paciente e abre os detalhes', async () => {
    const user = userEvent.setup()
    renderPatients()

    expect(await screen.findByText('Maria da Silva')).toBeInTheDocument()
    expect(screen.getByText('123.456.789-01')).toBeInTheDocument()
    expect(screen.getByText('(11) 99999-9999')).toBeInTheDocument()

    // O card inteiro virou link: o alvo acessível é o nome do paciente.
    await user.click(screen.getByRole('link', { name: 'Maria da Silva' }))
    expect(await screen.findByText('Detalhes carregados')).toBeInTheDocument()
  })

  it('mantém a busca por nome ou CPF disponível', async () => {
    const user = userEvent.setup()
    renderPatients()

    await screen.findByText('Maria da Silva')
    await user.type(screen.getByLabelText('Buscar paciente'), '12345678901')

    expect(mockedListPatients).toHaveBeenLastCalledWith('12345678901', 1)
  })
})
