import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../../../components/ui/ToastProvider'
import type { ApiErrorBody } from '../../../lib/api'
import { AuthContext, type AuthContextValue } from '../../auth/auth-context'
import {
  listQueue,
  registerPatient,
  startAttendance,
  forwardAttendance,
} from '../atendimentos.api'
import type {
  AttendanceDetail,
  AttendanceListItem,
  QueueResponse,
} from '../atendimentos.types'
import { QueuePage } from './QueuePage'

vi.mock('../atendimentos.api', () => ({
  listQueue: vi.fn(),
  registerPatient: vi.fn(),
  startAttendance: vi.fn(),
  forwardAttendance: vi.fn(),
}))

const mockedListQueue = vi.mocked(listQueue)
const mockedRegisterPatient = vi.mocked(registerPatient)
const mockedStartAttendance = vi.mocked(startAttendance)
const mockedForwardAttendance = vi.mocked(forwardAttendance)

const waitingAttendance: AttendanceListItem = {
  id: 'atendimento-1',
  status: 'AGUARDANDO',
  risco: 'AMARELO',
  entradaFila: '2026-08-14T12:00:00.000Z',
  iniciadoEm: null,
  paciente: {
    id: 'paciente-1',
    nome: 'Maria da Silva',
    cpf: '12345678901',
    contato: '(11) 99999-9999',
  },
  profissional: null,
  encaminhadoDeId: null,
  encaminhadoPara: null,
}

function queueResponse(itens: AttendanceListItem[]): QueueResponse {
  return {
    itens,
    atendimentoAtivo: null,
    // `resumo` vem do backend e não depende da paginação — por isso as
    // contagens abaixo são derivadas do conjunto, não da página.
    resumo: {
      totalPeriodo: itens.length,
      aguardando: itens.filter((item) => item.status === 'AGUARDANDO').length,
      emAndamento: itens.filter((item) => item.status === 'EM_ANDAMENTO')
        .length,
      finalizados: 0,
      cancelados: 0,
      altaPrioridade: itens.filter(
        (item) => item.risco === 'VERMELHO' || item.risco === 'LARANJA',
      ).length,
      semTriagem: itens.filter((item) => item.risco === null).length,
    },
    total: itens.length,
    pagina: 1,
    porPagina: 10,
    paginas: itens.length > 0 ? 1 : 0,
  }
}

function renderQueue() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
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

  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthContext.Provider value={auth}>
          <MemoryRouter initialEntries={['/fila']}>
            <Routes>
              <Route path="/fila" element={<QueuePage />} />
              <Route
                path="/pacientes/:id"
                element={<p>Ficha do paciente carregada</p>}
              />
              <Route
                path="/atendimentos/:id/sala"
                element={<p>Sala profissional carregada</p>}
              />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

function conflictError() {
  const data: ApiErrorBody = {
    codigo: 'ATENDIMENTO_JA_ASSUMIDO',
    mensagem: 'Este atendimento já foi assumido por outro profissional.',
  }
  const response: AxiosResponse<ApiErrorBody> = {
    data,
    status: 409,
    statusText: 'Conflict',
    headers: {},
    config: { headers: new AxiosHeaders() },
  }

  return new AxiosError(
    'Conflict',
    AxiosError.ERR_BAD_RESPONSE,
    response.config,
    undefined,
    response,
  )
}

describe('QueuePage', () => {
  beforeEach(() => {
    mockedListQueue.mockReset()
    mockedRegisterPatient.mockReset()
    mockedStartAttendance.mockReset()
    mockedForwardAttendance.mockReset()
  })

  it('apresenta o estado vazio sem quebrar a navegação', async () => {
    mockedListQueue.mockResolvedValue(queueResponse([]))
    renderQueue()

    expect(
      await screen.findByText('Nenhum atendimento encontrado'),
    ).toBeInTheDocument()
  })

  it('abre o cadastro da pessoa que seguirá para a triagem', async () => {
    const user = userEvent.setup()
    mockedListQueue.mockResolvedValue(queueResponse([]))
    renderQueue()

    await user.click(
      await screen.findByRole('button', { name: 'Cadastrar paciente' }),
    )

    expect(
      await screen.findByRole('heading', { name: 'Cadastrar paciente' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Abrir atendimento' }),
    ).not.toBeInTheDocument()
  })

  it('mantém a pessoa na fila depois do cadastro', async () => {
    const user = userEvent.setup()
    const registeredAttendance: AttendanceDetail = {
      ...waitingAttendance,
      finalizadoEm: null,
      canceladoEm: null,
      triagem: null,
      encaminhadoDe: null,
    }
    mockedListQueue.mockResolvedValue(queueResponse([]))
    mockedRegisterPatient.mockResolvedValue(registeredAttendance)
    renderQueue()

    await user.click(
      await screen.findByRole('button', { name: 'Cadastrar paciente' }),
    )
    // O cadastro virou um <dialog> modal, então o papel acessível é "dialog".
    const panel = screen.getByRole('dialog', { name: 'Cadastrar paciente' })
    await user.type(
      within(panel).getByLabelText('Nome completo'),
      'Maria da Silva',
    )
    await user.type(within(panel).getByLabelText('CPF'), '123.456.789-01')
    await user.type(within(panel).getByLabelText('Contato'), '(11) 99999-9999')
    await user.type(
      within(panel).getByLabelText('Data de nascimento'),
      '1990-01-15',
    )
    await user.click(
      within(panel).getByRole('button', { name: 'Cadastrar paciente' }),
    )

    expect(await screen.findByText('Paciente cadastrado')).toBeInTheDocument()
    expect(
      await screen.findByText(
        /Maria da Silva entrou na fila e aguarda o início do atendimento/,
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Sala profissional carregada'),
    ).not.toBeInTheDocument()
  })

  it('filtra a fila pelos casos de alta prioridade ao clicar no card', async () => {
    const user = userEvent.setup()
    mockedListQueue.mockResolvedValue(queueResponse([waitingAttendance]))
    renderQueue()

    // O card de métrica é o caminho que a equipe usa para responder "quem são
    // os urgentes de hoje?" — antes o número não levava a lugar nenhum.
    await user.click(
      await screen.findByRole('button', { name: /Alta prioridade/ }),
    )

    expect(mockedListQueue).toHaveBeenLastCalledWith(
      expect.objectContaining({
        status: ['AGUARDANDO', 'EM_ANDAMENTO'],
        risco: ['VERMELHO', 'LARANJA'],
        pagina: 1,
      }),
    )
  })

  it('permite filtrar a fila pelos atendimentos finalizados', async () => {
    const user = userEvent.setup()
    mockedListQueue.mockResolvedValue(queueResponse([]))
    renderQueue()

    await user.click(
      await screen.findByRole('combobox', { name: 'Filtrar por situação' }),
    )
    await user.click(screen.getByRole('option', { name: 'Finalizados' }))

    expect(mockedListQueue).toHaveBeenLastCalledWith(
      expect.objectContaining({
        status: ['FINALIZADO'],
        pagina: 1,
      }),
    )
  })

  it('permite filtrar a fila pelos atendimentos cancelados', async () => {
    const user = userEvent.setup()
    mockedListQueue.mockResolvedValue(queueResponse([]))
    renderQueue()

    await user.click(
      await screen.findByRole('combobox', { name: 'Filtrar por situação' }),
    )
    await user.click(screen.getByRole('option', { name: 'Cancelados' }))

    expect(mockedListQueue).toHaveBeenLastCalledWith(
      expect.objectContaining({
        status: ['CANCELADO'],
        pagina: 1,
      }),
    )
  })

  it('leva ao histórico do paciente pelo nome na fila', async () => {
    const user = userEvent.setup()
    mockedListQueue.mockResolvedValue(queueResponse([waitingAttendance]))
    renderQueue()

    const patientLinks = await screen.findAllByRole('link', {
      name: 'Maria da Silva',
    })
    await user.click(patientLinks[0])

    expect(
      await screen.findByText('Ficha do paciente carregada'),
    ).toBeInTheDocument()
  })

  it('mostra uma falha de carregamento e permite tentar novamente', async () => {
    mockedListQueue.mockRejectedValue(new Error('indisponível'))
    renderQueue()

    expect(
      await screen.findByText('Não foi possível carregar'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Tentar novamente' }),
    ).toBeInTheDocument()
  })

  it('envia a busca por nome para a consulta da fila', async () => {
    const user = userEvent.setup()
    mockedListQueue.mockResolvedValue(queueResponse([]))
    renderQueue()

    await screen.findByText('Nenhum atendimento encontrado')
    await user.type(screen.getByLabelText('Buscar atendimento'), 'Maria')

    expect(mockedListQueue).toHaveBeenLastCalledWith(
      expect.objectContaining({ busca: 'Maria', pagina: 1 }),
    )
  })

  it('explica o conflito quando outro profissional vence a disputa', async () => {
    const user = userEvent.setup()
    mockedListQueue.mockResolvedValue(queueResponse([waitingAttendance]))
    mockedStartAttendance.mockRejectedValue(conflictError())
    renderQueue()

    const attendButtons = await screen.findAllByRole('button', {
      name: 'Iniciar atendimento',
    })
    await user.click(attendButtons[0])

    expect(mockedStartAttendance).toHaveBeenCalledWith(
      'atendimento-1',
      expect.anything(),
    )
    expect(
      await screen.findByText(
        'Este atendimento já foi assumido por outro profissional.',
      ),
    ).toBeInTheDocument()
  })

  it('abre a sala após assumir o atendimento com sucesso', async () => {
    const user = userEvent.setup()
    const attendance: AttendanceDetail = {
      ...waitingAttendance,
      status: 'EM_ANDAMENTO',
      iniciadoEm: '2026-08-14T12:05:00.000Z',
      finalizadoEm: null,
      canceladoEm: null,
      triagem: null,
      encaminhadoDe: null,
    }
    mockedListQueue.mockResolvedValue(queueResponse([waitingAttendance]))
    mockedStartAttendance.mockResolvedValue(attendance)
    renderQueue()

    const attendButtons = await screen.findAllByRole('button', {
      name: 'Iniciar atendimento',
    })
    await user.click(attendButtons[0])

    expect(
      await screen.findByText('Sala profissional carregada'),
    ).toBeInTheDocument()
  })

  it('destaca o atendimento ativo mesmo fora do período da fila', async () => {
    const user = userEvent.setup()
    const activeAttendance: AttendanceListItem = {
      ...waitingAttendance,
      id: 'atendimento-antigo',
      status: 'EM_ANDAMENTO',
      entradaFila: '2026-08-12T12:00:00.000Z',
      iniciadoEm: '2026-08-12T12:05:00.000Z',
    }
    mockedListQueue.mockResolvedValue({
      ...queueResponse([]),
      atendimentoAtivo: activeAttendance,
    })
    renderQueue()

    expect(
      await screen.findByText('Atendimento em andamento'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Cadastrar paciente' }),
    ).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Retomar atendimento' }))

    expect(
      await screen.findByText('Sala profissional carregada'),
    ).toBeInTheDocument()
    expect(mockedStartAttendance).not.toHaveBeenCalled()
  })

  it('encaminha para o médico um atendimento já finalizado com triagem', async () => {
    const user = userEvent.setup()
    const finished: AttendanceListItem = {
      ...waitingAttendance,
      status: 'FINALIZADO',
      profissional: { id: 'enfermeiro-1', nome: 'Ana Ferreira' },
    }
    mockedListQueue.mockResolvedValue(queueResponse([finished]))
    mockedForwardAttendance.mockResolvedValue({
      ...waitingAttendance,
      id: 'atendimento-medico',
      encaminhadoDeId: finished.id,
      finalizadoEm: null,
      canceladoEm: null,
      triagem: null,
      encaminhadoDe: null,
    })
    renderQueue()

    const buttons = await screen.findAllByRole('button', {
      name: 'Encaminhar para médico',
    })
    await user.click(buttons[0])

    const dialog = await screen.findByRole('dialog', {
      name: 'Encaminhar para a fila médica?',
    })
    await user.click(
      within(dialog).getByRole('button', { name: 'Encaminhar paciente' }),
    )

    expect(mockedForwardAttendance).toHaveBeenCalledWith('atendimento-1')
    expect(await screen.findByText('Paciente encaminhado')).toBeInTheDocument()
  })

  it('exibe todas as colunas obrigatórias da fila de pronto atendimento', async () => {
    mockedListQueue.mockResolvedValue(queueResponse([waitingAttendance]))
    renderQueue()

    await screen.findAllByText('Maria da Silva')
    for (const column of [
      'Paciente',
      'Contato',
      'Classificação de risco',
      'Status',
      'Entrada na fila',
      'Tempo de espera',
    ]) {
      expect(
        screen.getByRole('columnheader', { name: column }),
      ).toBeInTheDocument()
    }
    expect(screen.getAllByText('(11) 99999-9999').length).toBeGreaterThan(0)
  })
})
