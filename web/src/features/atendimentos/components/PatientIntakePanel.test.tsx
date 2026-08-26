import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../../../components/ui/ToastProvider'
import { registerPatient } from '../atendimentos.api'
import type { AttendanceDetail } from '../atendimentos.types'
import { PatientIntakePanel } from './PatientIntakePanel'

vi.mock('../atendimentos.api', () => ({
  registerPatient: vi.fn(),
}))

const mockedRegisterPatient = vi.mocked(registerPatient)

const attendance: AttendanceDetail = {
  id: 'atendimento-novo',
  status: 'AGUARDANDO',
  risco: null,
  entradaFila: '2026-08-14T14:00:00.000Z',
  iniciadoEm: null,
  finalizadoEm: null,
  canceladoEm: null,
  paciente: {
    id: 'paciente-novo',
    nome: 'Maria da Silva',
    cpf: '12345678901',
    contato: '(11) 99999-9999',
  },
  profissional: null,
  encaminhadoDeId: null,
  encaminhadoPara: null,
  triagem: null,
  encaminhadoDe: null,
}

function renderPanel(onCreated = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <PatientIntakePanel open onClose={vi.fn()} onCreated={onCreated} />
      </ToastProvider>
    </QueryClientProvider>,
  )
  return onCreated
}

describe('PatientIntakePanel', () => {
  beforeEach(() => {
    mockedRegisterPatient.mockReset()
  })

  it('cadastra o paciente e o inclui na fila sem iniciar a triagem', async () => {
    const user = userEvent.setup()
    const onCreated = renderPanel()
    mockedRegisterPatient.mockResolvedValue(attendance)

    await user.type(screen.getByLabelText('Nome completo'), 'Maria da Silva')
    await user.type(screen.getByLabelText('CPF'), '123.456.789-01')
    await user.type(screen.getByLabelText('Contato'), '(11) 99999-9999')
    await user.type(screen.getByLabelText('Data de nascimento'), '1990-01-15')
    await user.click(screen.getByRole('button', { name: 'Cadastrar paciente' }))

    expect(mockedRegisterPatient).toHaveBeenCalledWith({
      nome: 'Maria da Silva',
      cpf: '12345678901',
      contato: '(11) 99999-9999',
      nascimento: '1990-01-15',
    })
    expect(onCreated).toHaveBeenCalledWith(attendance)
  })

  it('não envia o formulário com CPF inválido', async () => {
    const user = userEvent.setup()
    renderPanel()

    await user.type(screen.getByLabelText('Nome completo'), 'Maria da Silva')
    await user.type(screen.getByLabelText('CPF'), '123')
    await user.type(screen.getByLabelText('Contato'), '(11) 99999-9999')
    await user.type(screen.getByLabelText('Data de nascimento'), '1990-01-15')
    await user.click(screen.getByRole('button', { name: 'Cadastrar paciente' }))

    expect(
      await screen.findByText('CPF deve conter 11 dígitos'),
    ).toBeInTheDocument()
    expect(mockedRegisterPatient).not.toHaveBeenCalled()
  })
})
