import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PropsWithChildren } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createTriage,
  finalizeAttendance,
  forwardAttendance,
  getAttendance,
} from '../../atendimentos/atendimentos.api'
import type { AttendanceDetail } from '../../atendimentos/atendimentos.types'
import { AuthContext, type AuthContextValue } from '../../auth/auth-context'
import {
  createMedicalRecord,
  getMedicalRecord,
  updateMedicalRecord,
} from '../../prontuario/prontuario.api'
import {
  createPatientInvite,
  createProfessionalRoomAccess,
} from '../sala.api'
import { ToastProvider } from '../../../components/ui/ToastProvider'
import { ProfessionalRoomPage } from './ProfessionalRoomPage'

vi.mock('@livekit/components-react', () => ({
  LiveKitRoom: ({
    children,
    onDisconnected,
  }: PropsWithChildren<{ onDisconnected?: () => void }>) => (
    <section>
      {children}
      <button type="button" onClick={onDisconnected}>
        Simular queda
      </button>
    </section>
  ),
  RoomAudioRenderer: () => null,
  VideoConference: () => <p>Sala conectada</p>,
}))

vi.mock('../../atendimentos/atendimentos.api', () => ({
  getAttendance: vi.fn(),
  createTriage: vi.fn(),
  forwardAttendance: vi.fn(),
  finalizeAttendance: vi.fn(),
}))

vi.mock('../sala.api', () => ({
  createProfessionalRoomAccess: vi.fn(),
  createPatientInvite: vi.fn(),
}))

vi.mock('../../prontuario/prontuario.api', () => ({
  getMedicalRecord: vi.fn(),
  createMedicalRecord: vi.fn(),
  updateMedicalRecord: vi.fn(),
}))

const mockedGetAttendance = vi.mocked(getAttendance)
const mockedCreateTriage = vi.mocked(createTriage)
const mockedForwardAttendance = vi.mocked(forwardAttendance)
const mockedFinalizeAttendance = vi.mocked(finalizeAttendance)
const mockedCreateAccess = vi.mocked(createProfessionalRoomAccess)
const mockedCreateInvite = vi.mocked(createPatientInvite)
const mockedGetMedicalRecord = vi.mocked(getMedicalRecord)
const mockedCreateMedicalRecord = vi.mocked(createMedicalRecord)
const mockedUpdateMedicalRecord = vi.mocked(updateMedicalRecord)

const attendance: AttendanceDetail = {
  id: 'atendimento-1',
  status: 'EM_ANDAMENTO',
  risco: 'VERDE',
  entradaFila: '2026-08-14T12:00:00.000Z',
  iniciadoEm: '2026-08-14T12:05:00.000Z',
  finalizadoEm: null,
  canceladoEm: null,
  paciente: {
    id: 'paciente-1',
    nome: 'Maria da Silva',
    cpf: '12345678901',
    contato: '(11) 99999-9999',
  },
  profissional: { id: 'enfermeiro-1', nome: 'Ana Ferreira' },
  encaminhadoDeId: null,
  encaminhadoPara: null,
  triagem: null,
  encaminhadoDe: null,
}

const auth: AuthContextValue = {
  user: {
    id: 'enfermeiro-1',
    nome: 'Ana Ferreira',
    email: 'ana.ferreira@pad.local',
    papel: 'ENFERMEIRO',
  },
  token: 'token-api',
  signIn: vi.fn(),
  signOut: vi.fn(),
}

function renderRoom(authValue = auth) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthContext.Provider value={authValue}>
          <MemoryRouter initialEntries={['/atendimentos/atendimento-1/sala']}>
            <Routes>
              <Route
                path="/atendimentos/:id/sala"
                element={<ProfessionalRoomPage />}
              />
              <Route path="/fila" element={<p>Fila profissional</p>} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('ProfessionalRoomPage', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  beforeEach(() => {
    mockedGetAttendance.mockReset().mockResolvedValue(attendance)
    mockedCreateTriage.mockReset()
    mockedForwardAttendance.mockReset()
    mockedFinalizeAttendance.mockReset()
    mockedCreateAccess.mockReset().mockResolvedValue({
      token: 'jwt-profissional',
      url: 'ws://localhost:7880',
      sala: 'atendimento_atendimento-1',
      atendimentoId: attendance.id,
      participante: 'PROFISSIONAL',
      expiraEm: '2026-08-14T13:00:00.000Z',
    })
    mockedCreateInvite.mockReset()
    mockedGetMedicalRecord.mockReset().mockResolvedValue(null)
    mockedCreateMedicalRecord.mockReset()
    mockedUpdateMedicalRecord.mockReset()
  })

  it('gera um link temporário para o paciente no lobby', async () => {
    const user = userEvent.setup()
    mockedCreateInvite.mockResolvedValue({
      token: 'convite-opaco',
      atendimentoId: attendance.id,
      expiraEm: '2026-08-14T13:00:00.000Z',
      link: `/sala/${attendance.id}?token=convite-opaco`,
    })
    renderRoom()

    await user.click(
      await screen.findByRole('button', {
        name: 'Gerar convite do paciente',
      }),
    )

    expect(mockedCreateInvite).toHaveBeenCalledWith(attendance.id)
    expect(screen.getByLabelText('Link do paciente')).toHaveValue(
      `http://localhost:3000/sala/${attendance.id}?token=convite-opaco`,
    )
  })

  it('usa a origem pública configurada no convite compartilhável', async () => {
    const user = userEvent.setup()
    vi.stubEnv('VITE_PUBLIC_APP_URL', 'https://pad.exemplo.com.br')
    mockedCreateInvite.mockResolvedValue({
      token: 'convite-opaco',
      atendimentoId: attendance.id,
      expiraEm: '2026-08-14T13:00:00.000Z',
      link: `/sala/${attendance.id}?token=convite-opaco`,
    })
    renderRoom()

    await user.click(
      await screen.findByRole('button', {
        name: 'Gerar convite do paciente',
      }),
    )

    expect(screen.getByLabelText('Link do paciente')).toHaveValue(
      `https://pad.exemplo.com.br/sala/${attendance.id}?token=convite-opaco`,
    )
  })

  it('mantém o atendimento aberto e permite reconectar após uma queda', async () => {
    const user = userEvent.setup()
    renderRoom()

    await user.click(
      await screen.findByRole('button', { name: 'Entrar na sala segura' }),
    )
    await user.click(await screen.findByRole('button', { name: 'Simular queda' }))

    expect(
      screen.getByText('A videochamada foi encerrada'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Fila profissional')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Reconectar' }))
    expect(mockedCreateAccess).toHaveBeenCalledTimes(2)
  })

  it('salva a triagem e encaminha ao médico durante a videochamada', async () => {
    const user = userEvent.setup()
    const triagedAttendance: AttendanceDetail = {
      ...attendance,
      triagem: {
        queixa: 'Febre e mal-estar desde ontem',
        pa: '120/80',
        fc: 82,
        temperatura: 37.8,
        satO2: 98,
        criadoEm: '2026-08-14T12:10:00.000Z',
      },
    }
    mockedCreateTriage.mockResolvedValue(triagedAttendance)
    mockedForwardAttendance.mockResolvedValue(triagedAttendance)
    renderRoom()

    await user.click(
      await screen.findByRole('button', { name: 'Entrar na sala segura' }),
    )
    await user.type(
      await screen.findByLabelText('Queixa principal'),
      'Febre e mal-estar desde ontem',
    )
    await user.click(screen.getByRole('button', { name: 'Salvar triagem' }))

    expect(mockedCreateTriage).toHaveBeenCalledWith({
      attendanceId: attendance.id,
      input: expect.objectContaining({
        queixa: 'Febre e mal-estar desde ontem',
        risco: 'VERDE',
      }),
    })

    expect(
      await screen.findByRole('button', { name: 'Encaminhar para médico' }),
    ).toBeInTheDocument()
    await user.click(
      screen.getByRole('button', { name: 'Encaminhar para médico' }),
    )
    await user.click(
      await screen.findByRole('button', { name: 'Encaminhar paciente' }),
    )

    expect(mockedForwardAttendance).toHaveBeenCalledWith(attendance.id)
    expect(await screen.findByText('Fila profissional')).toBeInTheDocument()
  })

  it('mantém o encaminhamento disponível depois de sair da videochamada', async () => {
    const user = userEvent.setup()
    const triagedAttendance: AttendanceDetail = {
      ...attendance,
      triagem: {
        queixa: 'Dor de cabeça desde o início da manhã',
        pa: '120/80',
        fc: 78,
        temperatura: 36.5,
        satO2: 99,
        criadoEm: '2026-08-14T12:10:00.000Z',
      },
    }
    mockedGetAttendance.mockResolvedValue(triagedAttendance)
    mockedForwardAttendance.mockResolvedValue(triagedAttendance)
    renderRoom()

    await user.click(
      await screen.findByRole('button', { name: 'Entrar na sala segura' }),
    )
    await user.click(
      screen.getByRole('button', {
        name: 'Encerrar videochamada e revisar atendimento',
      }),
    )

    expect(screen.queryByText('Sala conectada')).not.toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        name: 'Revise e conclua as ações assistenciais',
      }),
    ).toBeInTheDocument()
    await user.click(
      screen.getByRole('button', { name: 'Encaminhar para médico' }),
    )
    await user.click(
      await screen.findByRole('button', { name: 'Encaminhar paciente' }),
    )

    expect(mockedForwardAttendance).toHaveBeenCalledWith(attendance.id)
    expect(await screen.findByText('Fila profissional')).toBeInTheDocument()
  })

  it('mantém as ações acessíveis ao retomar um atendimento sem reabrir a reunião', async () => {
    mockedGetAttendance.mockResolvedValue({
      ...attendance,
      triagem: {
        queixa: 'Dor de cabeça desde o início da manhã',
        pa: '120/80',
        fc: 78,
        temperatura: 36.5,
        satO2: 99,
        criadoEm: '2026-08-14T12:10:00.000Z',
      },
    })

    renderRoom()

    expect(
      await screen.findByRole('button', { name: 'Encaminhar para médico' }),
    ).toBeInTheDocument()
    expect(mockedCreateAccess).not.toHaveBeenCalled()
  })

  it('permite ao médico salvar o prontuário e finalizar a consulta', async () => {
    const user = userEvent.setup()
    const doctorAuth: AuthContextValue = {
      ...auth,
      user: {
        id: 'medico-1',
        nome: 'Diego Ramos',
        email: 'diego.ramos@pad.local',
        papel: 'MEDICO',
      },
    }
    mockedCreateMedicalRecord.mockResolvedValue({
      id: 'prontuario-1',
      atendimentoId: attendance.id,
      autorId: 'medico-1',
      anamnese: 'Paciente relata febre desde ontem.',
      conduta: 'Orientada hidratação e acompanhamento.',
      prescricao: null,
      finalizadoEm: null,
      criadoEm: '2026-08-14T12:10:00.000Z',
      atualizadoEm: '2026-08-14T12:10:00.000Z',
      autor: { nome: 'Diego Ramos' },
      adendos: [],
    })
    mockedFinalizeAttendance.mockResolvedValue(attendance)
    renderRoom(doctorAuth)

    await user.click(
      await screen.findByRole('button', { name: 'Entrar na sala segura' }),
    )
    await user.type(
      await screen.findByLabelText('Anamnese'),
      'Paciente relata febre desde ontem.',
    )
    await user.type(
      screen.getByLabelText('Conduta'),
      'Orientada hidratação e acompanhamento.',
    )
    await user.click(screen.getByRole('button', { name: 'Salvar e finalizar' }))
    // Finalizar encerra a sala e revoga o convite: passa por confirmação.
    const finishDialog = await screen.findByRole('dialog', {
      name: 'Finalizar o atendimento?',
    })
    await user.click(
      within(finishDialog).getByRole('button', { name: 'Salvar e finalizar' }),
    )

    expect(mockedCreateMedicalRecord).toHaveBeenCalledWith({
      attendanceId: attendance.id,
      input: {
        anamnese: 'Paciente relata febre desde ontem.',
        conduta: 'Orientada hidratação e acompanhamento.',
        prescricao: null,
      },
    })
    expect(mockedFinalizeAttendance).toHaveBeenCalledWith(attendance.id)
    expect(await screen.findByText('Fila profissional')).toBeInTheDocument()
  })
})
