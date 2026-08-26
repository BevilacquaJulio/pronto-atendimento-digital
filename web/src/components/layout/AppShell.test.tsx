import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../../features/auth/auth-context'
import { AppShell } from './AppShell'

function renderShell(signOut = vi.fn()) {
  const auth: AuthContextValue = {
    user: {
      id: 'enfermeiro-1',
      nome: 'Ana Ferreira',
      email: 'ana.ferreira@pad.local',
      papel: 'ENFERMEIRO',
    },
    token: 'token-teste',
    signIn: vi.fn(),
    signOut,
  }

  render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={['/fila']}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/fila" element={<p>Conteúdo da fila</p>} />
            <Route path="/pacientes" element={<p>Conteúdo de pacientes</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )

  return signOut
}

describe('AppShell', () => {
  it('mantém o menu móvel aberto depois do clique', async () => {
    const user = userEvent.setup()
    renderShell()

    const drawer = screen.getByRole('complementary', {
      name: 'Menu de navegação',
    })
    expect(drawer).not.toHaveClass('is-open')

    await user.click(screen.getByRole('button', { name: 'Abrir menu' }))

    // Regressão: com o objeto do useDisclosure na lista de dependências, o
    // efeito de fechar-ao-navegar rodava a cada render e o menu fechava no
    // mesmo ciclo em que abria.
    expect(drawer).toHaveClass('is-open')
  })

  it('fecha o menu móvel ao navegar para outra rota', async () => {
    const user = userEvent.setup()
    renderShell()

    await user.click(screen.getByRole('button', { name: 'Abrir menu' }))
    const drawer = screen.getByRole('complementary', {
      name: 'Menu de navegação',
    })
    expect(drawer).toHaveClass('is-open')

    const [patientsLink] = screen.getAllByRole('link', { name: /Pacientes/ })
    await user.click(patientsLink)

    expect(await screen.findByText('Conteúdo de pacientes')).toBeInTheDocument()
    expect(drawer).not.toHaveClass('is-open')
  })

  it('só encerra a sessão depois da confirmação', async () => {
    const user = userEvent.setup()
    const signOut = renderShell()

    await user.click(
      screen.getByRole('button', { name: 'Conta de Ana Ferreira' }),
    )
    await user.click(screen.getByRole('menuitem', { name: /Encerrar sessão/ }))

    expect(signOut).not.toHaveBeenCalled()

    const dialog = await screen.findByRole('dialog', {
      name: 'Encerrar sessão?',
    })
    await user.click(
      screen.getByRole('button', { name: 'Continuar trabalhando' }),
    )
    expect(signOut).not.toHaveBeenCalled()
    expect(dialog).not.toHaveAttribute('open')
  })

  it('mostra apenas a navegação do papel do usuário', () => {
    renderShell()

    expect(screen.getAllByRole('link', { name: /Fila de atendimentos/ })[0])
      .toBeInTheDocument()
    // Enfermagem não administra acessos: o item nem é renderizado.
    expect(
      screen.queryByRole('link', { name: /Usuários e acessos/ }),
    ).not.toBeInTheDocument()
  })
})
