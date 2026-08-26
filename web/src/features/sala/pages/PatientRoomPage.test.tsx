import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PropsWithChildren } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ApiErrorBody } from '../../../lib/api'
import { exchangePatientLink, renewPatientRoomAccess } from '../sala.api'
import { PatientRoomPage } from './PatientRoomPage'

vi.mock('@livekit/components-react', () => ({
  LiveKitRoom: ({
    children,
    onDisconnected,
    token,
  }: PropsWithChildren<{ onDisconnected?: () => void; token?: string }>) => (
    <section data-testid={`livekit-${token}`}>
      {children}
      <button type="button" onClick={onDisconnected}>
        Simular queda
      </button>
    </section>
  ),
  RoomAudioRenderer: () => null,
  VideoConference: () => <p>Sala conectada</p>,
}))

vi.mock('../sala.api', () => ({
  exchangePatientLink: vi.fn(),
  renewPatientRoomAccess: vi.fn(),
}))

const mockedExchangePatientLink = vi.mocked(exchangePatientLink)
const mockedRenewPatientRoomAccess = vi.mocked(renewPatientRoomAccess)

function renderPatientRoom(route: string) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/sala/:atendimentoId" element={<PatientRoomPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function expiredLinkError() {
  const data: ApiErrorBody = {
    codigo: 'LINK_INVALIDO',
    mensagem: 'Este convite expirou ou já foi utilizado.',
  }
  const response: AxiosResponse<ApiErrorBody> = {
    data,
    status: 410,
    statusText: 'Gone',
    headers: {},
    config: { headers: new AxiosHeaders() },
  }

  return new AxiosError(
    'Gone',
    AxiosError.ERR_BAD_RESPONSE,
    response.config,
    undefined,
    response,
  )
}

describe('PatientRoomPage', () => {
  beforeEach(() => {
    mockedExchangePatientLink.mockReset()
    mockedRenewPatientRoomAccess.mockReset()
  })

  it('bloqueia um convite sem token', () => {
    renderPatientRoom('/sala/atendimento-1')

    expect(screen.getByText('Link de acesso incompleto')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Entrar no atendimento' }),
    ).toBeDisabled()
  })

  it('explica quando o convite expirou ou já foi utilizado', async () => {
    const user = userEvent.setup()
    mockedExchangePatientLink.mockRejectedValue(expiredLinkError())
    renderPatientRoom('/sala/atendimento-1?token=convite-opaco')

    await user.click(
      screen.getByRole('button', { name: 'Entrar no atendimento' }),
    )

    expect(mockedExchangePatientLink).toHaveBeenCalledWith({
      attendanceId: 'atendimento-1',
      token: 'convite-opaco',
    })
    expect(
      await screen.findByText('Este convite expirou ou já foi utilizado.'),
    ).toBeInTheDocument()
  })

  it('conecta a sala depois da troca válida do convite', async () => {
    const user = userEvent.setup()
    mockedExchangePatientLink.mockResolvedValue({
      token: 'jwt-livekit',
      url: 'ws://localhost:7880',
      sala: 'atendimento_atendimento-1',
      atendimentoId: 'atendimento-1',
      participante: 'PACIENTE',
      expiraEm: '2026-08-14T13:00:00.000Z',
    })
    renderPatientRoom('/sala/atendimento-1?token=convite-opaco')

    await user.click(
      screen.getByRole('button', { name: 'Entrar no atendimento' }),
    )

    expect(await screen.findByText('Sala conectada')).toBeInTheDocument()
  })

  it('renova o token atual e reconecta sem reutilizar o convite', async () => {
    const user = userEvent.setup()
    mockedExchangePatientLink.mockResolvedValue({
      token: 'jwt-livekit-atual',
      url: 'ws://localhost:7880',
      sala: 'atendimento_atendimento-1',
      atendimentoId: 'atendimento-1',
      participante: 'PACIENTE',
      expiraEm: '2026-08-14T13:00:00.000Z',
    })
    mockedRenewPatientRoomAccess.mockResolvedValue({
      token: 'jwt-livekit-renovado',
      url: 'ws://localhost:7880',
      sala: 'atendimento_atendimento-1',
      atendimentoId: 'atendimento-1',
      participante: 'PACIENTE',
      expiraEm: '2026-08-14T13:15:00.000Z',
    })
    renderPatientRoom('/sala/atendimento-1?token=convite-opaco')

    await user.click(
      screen.getByRole('button', { name: 'Entrar no atendimento' }),
    )
    await user.click(
      await screen.findByRole('button', { name: 'Simular queda' }),
    )

    expect(screen.getByText('Sua conexão com a sala caiu')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reconectar' }))

    expect(mockedRenewPatientRoomAccess).toHaveBeenCalledWith({
      attendanceId: 'atendimento-1',
      token: 'jwt-livekit-atual',
    })
    expect(
      await screen.findByTestId('livekit-jwt-livekit-renovado'),
    ).toBeInTheDocument()
    expect(mockedExchangePatientLink).toHaveBeenCalledTimes(1)
  })
})
