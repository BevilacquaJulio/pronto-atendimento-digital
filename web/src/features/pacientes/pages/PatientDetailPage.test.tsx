import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../../auth/auth-context'
import { getPatient } from '../pacientes.api'
import { PatientDetailPage } from './PatientDetailPage'

vi.mock('../pacientes.api', () => ({
  getPatient: vi.fn(),
}))

const mockedGetPatient = vi.mocked(getPatient)

const auth: AuthContextValue = {
  user: {
    id: 'medico-1',
    nome: 'Carla Nogueira',
    email: 'carla.nogueira@pad.local',
    papel: 'MEDICO',
  },
  token: 'token-teste',
  signIn: vi.fn(),
  signOut: vi.fn(),
}

function renderPatientDetail() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={auth}>
        <MemoryRouter initialEntries={['/pacientes/paciente-1']}>
          <Routes>
            <Route path="/pacientes/:id" element={<PatientDetailPage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

describe('PatientDetailPage', () => {
  beforeEach(() => {
    mockedGetPatient.mockReset().mockResolvedValue({
      id: 'paciente-1',
      nome: 'Maria da Silva',
      cpf: '12345678901',
      contato: '(11) 99999-9999',
      nascimento: '1990-01-15T00:00:00.000Z',
      atendimentos: [
        {
          id: 'atendimento-1',
          status: 'FINALIZADO',
          risco: 'AMARELO',
          entradaFila: '2026-08-14T12:00:00.000Z',
          iniciadoEm: '2026-08-14T12:05:00.000Z',
          finalizadoEm: '2026-08-14T12:30:00.000Z',
          canceladoEm: null,
          profissional: { id: 'medico-1', nome: 'Carla Nogueira' },
          triagem: {
            queixa: 'Cefaleia e mal-estar',
            pa: '120/80',
            fc: 82,
            // A API devolve Decimal como string. Number aqui esconderia o
            // crash que deixava a ficha em branco.
            temperatura: '37.2',
            satO2: 98,
            criadoEm: '2026-08-14T12:10:00.000Z',
          },
          prontuario: {
            id: 'prontuario-1',
            anamnese: 'Paciente relata cefaleia desde ontem.',
            conduta: 'Orientada hidratação e repouso.',
            prescricao: 'Analgésico conforme orientação.',
            finalizadoEm: '2026-08-14T12:30:00.000Z',
            autor: { id: 'medico-1', nome: 'Carla Nogueira' },
            adendos: [],
          },
        },
      ],
    })
  })

  it('apresenta identificação, sinais vitais e prontuário anterior', async () => {
    renderPatientDetail()

    expect(await screen.findByText('Maria da Silva')).toBeInTheDocument()
    expect(screen.getByText('123.456.789-01')).toBeInTheDocument()
    expect(screen.getByText('(11) 99999-9999')).toBeInTheDocument()
    expect(screen.getByText('Cefaleia e mal-estar')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Paciente cadastrado' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Triagem de enfermagem' })).toBeInTheDocument()
    expect(screen.getByText('120/80')).toBeInTheDocument()
    expect(screen.getByText('37.2')).toBeInTheDocument()
    expect(
      screen.getByText('Paciente relata cefaleia desde ontem.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Analgésico conforme orientação.'),
    ).toBeInTheDocument()
  })

  it('explica um paciente cadastrado cujo atendimento ainda não começou', async () => {
    mockedGetPatient.mockResolvedValue({
      id: 'paciente-1',
      nome: 'Maria Candelaria',
      cpf: '55616368040',
      contato: '11988712451',
      nascimento: '2000-08-09T00:00:00.000Z',
      atendimentos: [
        {
          id: 'atendimento-1',
          status: 'AGUARDANDO',
          risco: null,
          entradaFila: '2026-08-14T04:27:00.000Z',
          iniciadoEm: null,
          finalizadoEm: null,
          canceladoEm: null,
          profissional: null,
          triagem: null,
        },
      ],
    })

    renderPatientDetail()

    expect(
      await screen.findByRole('heading', {
        name: 'Paciente cadastrado',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Cadastro concluído e paciente incluído na fila de atendimento.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Cadastro')).toBeInTheDocument()
    expect(screen.queryByText('Sem triagem')).not.toBeInTheDocument()
    expect(screen.queryByText('Em atendimento')).not.toBeInTheDocument()
    expect(screen.queryByText('Triagem pendente')).not.toBeInTheDocument()
    expect(screen.queryByText('Atendimento aberto')).not.toBeInTheDocument()
    expect(screen.queryByText('Ana Ferreira')).not.toBeInTheDocument()
  })

  it('mostra a triagem pendente uma única vez durante o atendimento', async () => {
    mockedGetPatient.mockResolvedValue({
      id: 'paciente-1',
      nome: 'Maria Candelaria',
      cpf: '55616368040',
      contato: '11988712451',
      nascimento: '2000-08-09T00:00:00.000Z',
      atendimentos: [
        {
          id: 'atendimento-1',
          status: 'EM_ANDAMENTO',
          risco: null,
          entradaFila: '2026-08-14T04:20:00.000Z',
          iniciadoEm: '2026-08-14T04:27:00.000Z',
          finalizadoEm: null,
          canceladoEm: null,
          profissional: { id: 'enfermeiro-1', nome: 'Ana Ferreira' },
          triagem: null,
        },
      ],
    })

    renderPatientDetail()

    expect(
      await screen.findByRole('heading', { name: 'Paciente cadastrado' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Triagem pendente' }),
    ).toBeInTheDocument()
    expect(screen.getAllByText('Triagem pendente')).toHaveLength(1)
    expect(screen.getByText('Ana Ferreira')).toBeInTheDocument()
    expect(screen.getByText('Atendimento iniciado')).toBeInTheDocument()
    expect(screen.queryByText('Sem triagem')).not.toBeInTheDocument()
    expect(screen.queryByText('Em atendimento')).not.toBeInTheDocument()
    expect(screen.queryByText('Atendimento aberto')).not.toBeInTheDocument()
  })
})
