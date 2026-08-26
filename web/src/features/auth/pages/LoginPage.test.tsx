import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../AuthContext'
import { login } from '../auth.api'
import { LoginPage } from './LoginPage'

vi.mock('../auth.api', () => ({ login: vi.fn() }))

const mockedLogin = vi.mocked(login)

function renderLogin() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/fila" element={<div>Fila carregada</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    sessionStorage.clear()
    mockedLogin.mockReset()
  })

  it('apresenta a marca e campos acessíveis', () => {
    renderLogin()

    expect(
      screen.getAllByRole('img', { name: /Pronto Atendimento Digital/i }).length,
    ).toBeGreaterThan(0)
    expect(screen.getByLabelText('E-mail profissional')).toBeInTheDocument()
    expect(screen.getByLabelText('Senha')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Acessar plataforma' }),
    ).toBeInTheDocument()
  })

  it('valida os campos antes de enviar', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.click(screen.getByRole('button', { name: 'Acessar plataforma' }))

    expect(await screen.findByText('Informe um e-mail válido')).toBeInTheDocument()
    expect(screen.getByText('Informe sua senha')).toBeInTheDocument()
    expect(mockedLogin).not.toHaveBeenCalled()
  })

  it('autentica e direciona o profissional para a fila', async () => {
    const user = userEvent.setup()
    mockedLogin.mockResolvedValue({
      token: 'token-teste',
      usuario: {
        id: 'usuario-1',
        nome: 'Carla Nogueira',
        email: 'carla.nogueira@pad.local',
        papel: 'MEDICO',
      },
    })
    renderLogin()

    await user.type(
      screen.getByLabelText('E-mail profissional'),
      'carla.nogueira@pad.local',
    )
    await user.type(screen.getByLabelText('Senha'), 'Senha@123')
    await user.click(screen.getByRole('button', { name: 'Acessar plataforma' }))

    expect(await screen.findByText('Fila carregada')).toBeInTheDocument()
    await waitFor(() => expect(sessionStorage.getItem('pad.session')).toBeTruthy())
  })

  it('mostra uma mensagem quando a autenticação falha', async () => {
    const user = userEvent.setup()
    mockedLogin.mockRejectedValue(new Error('falha'))
    renderLogin()

    await user.type(screen.getByLabelText('E-mail profissional'), 'teste@pad.local')
    await user.type(screen.getByLabelText('Senha'), 'senha')
    await user.click(screen.getByRole('button', { name: 'Acessar plataforma' }))

    expect(
      await screen.findByText('Não foi possível concluir a operação.'),
    ).toBeInTheDocument()
  })
})
