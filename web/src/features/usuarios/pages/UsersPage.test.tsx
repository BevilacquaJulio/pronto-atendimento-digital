import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../../../components/ui/ToastProvider'
import { AuthContext, type AuthContextValue } from '../../auth/auth-context'
import {
  createUser,
  listUsers,
  setUserActive,
  updateUserRole,
} from '../usuarios.api'
import type { UserListItem, UsersResponse } from '../usuarios.types'
import { UsersPage } from './UsersPage'

vi.mock('../usuarios.api', () => ({
  listUsers: vi.fn(),
  setUserActive: vi.fn(),
  createUser: vi.fn(),
  updateUserRole: vi.fn(),
}))

const mockedListUsers = vi.mocked(listUsers)
const mockedSetUserActive = vi.mocked(setUserActive)
const mockedCreateUser = vi.mocked(createUser)
const mockedUpdateUserRole = vi.mocked(updateUserRole)

const nurse: UserListItem = {
  id: 'usuario-1',
  nome: 'Ana Ferreira',
  email: 'ana.ferreira@pad.local',
  papel: 'ENFERMEIRO',
  ativo: true,
  criadoEm: '2026-08-14T10:00:00.000Z',
}

const response: UsersResponse = {
  itens: [nurse],
  total: 1,
  pagina: 1,
  porPagina: 15,
  paginas: 1,
}

const adminAuth: AuthContextValue = {
  user: {
    id: 'admin-1',
    nome: 'Administrador PAD',
    email: 'admin@pad.local',
    papel: 'ADMIN',
  },
  token: 'token-teste',
  signIn: vi.fn(),
  signOut: vi.fn(),
}

function renderUsers() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={adminAuth}>
        <ToastProvider>
          <UsersPage />
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

/**
 * Abre o dropdown customizado e escolhe uma opção.
 *
 * Existe porque `userEvent.selectOptions` só funciona com `<select>` nativo.
 * O `Select` do PAD é um combobox ARIA (botão + listbox), e o teste imita o
 * que a pessoa faz: clica no gatilho, clica na opção.
 */
async function chooseOption(
  user: ReturnType<typeof userEvent.setup>,
  comboboxName: string | RegExp,
  optionName: string | RegExp,
) {
  // A página renderiza tabela e cards ao mesmo tempo (o CSS decide qual
  // aparece), então o mesmo controle existe duas vezes no DOM. O teste usa a
  // primeira ocorrência — a da tabela.
  const [combobox] = await screen.findAllByRole('combobox', {
    name: comboboxName,
  })
  await user.click(combobox)

  const [option] = await screen.findAllByRole('option', { name: optionName })
  await user.click(option)
}

describe('UsersPage', () => {
  beforeEach(() => {
    mockedListUsers.mockReset().mockResolvedValue(response)
    mockedSetUserActive.mockReset()
    mockedCreateUser.mockReset()
    mockedUpdateUserRole.mockReset()
  })

  it('exige confirmação antes de alterar o perfil de um profissional', async () => {
    const user = userEvent.setup()
    mockedUpdateUserRole.mockResolvedValue({ ...nurse, papel: 'MEDICO' })
    renderUsers()

    await screen.findAllByText('Ana Ferreira')
    await chooseOption(user, 'Perfil de Ana Ferreira', /Medicina/)

    // Escolher no dropdown não muda nada sozinho: trocar de papel é
    // escalação de privilégio e passa por confirmação explícita.
    expect(mockedUpdateUserRole).not.toHaveBeenCalled()
    expect(
      await screen.findByRole('dialog', {
        name: 'Alterar o perfil de Ana Ferreira?',
      }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Alterar perfil' }))

    expect(mockedUpdateUserRole).toHaveBeenCalledWith(
      { id: nurse.id, papel: 'MEDICO' },
      expect.anything(),
    )
  })

  it('cancela a troca de perfil sem chamar a API', async () => {
    const user = userEvent.setup()
    renderUsers()

    await screen.findAllByText('Ana Ferreira')
    await chooseOption(user, 'Perfil de Ana Ferreira', /Administração/)
    await user.click(
      await screen.findByRole('button', { name: 'Manter perfil atual' }),
    )

    expect(mockedUpdateUserRole).not.toHaveBeenCalled()
  })

  it('exige confirmação antes de desativar um acesso', async () => {
    const user = userEvent.setup()
    mockedSetUserActive.mockResolvedValue({ ...nurse, ativo: false })
    renderUsers()

    const deactivateButtons = await screen.findAllByRole('button', {
      name: 'Desativar',
    })
    await user.click(deactivateButtons[0])

    expect(mockedSetUserActive).not.toHaveBeenCalled()
    expect(
      await screen.findByRole('dialog', {
        name: 'Desativar o acesso de Ana Ferreira?',
      }),
    ).toBeInTheDocument()

    const dialog = screen.getByRole('dialog', {
      name: 'Desativar o acesso de Ana Ferreira?',
    })
    await user.click(
      within(dialog).getByRole('button', { name: 'Desativar acesso' }),
    )

    expect(mockedSetUserActive).toHaveBeenCalledWith(nurse, expect.anything())
  })

  it('cadastra um novo usuário com o perfil selecionado', async () => {
    const user = userEvent.setup()
    mockedCreateUser.mockResolvedValue({
      ...nurse,
      id: 'usuario-2',
      nome: 'Carlos Souza',
      email: 'carlos@pad.local',
      papel: 'MEDICO',
    })
    renderUsers()

    await user.click(await screen.findByRole('button', { name: 'Novo usuário' }))
    await user.type(screen.getByLabelText('Nome completo'), 'Carlos Souza')
    await user.type(
      screen.getByLabelText('E-mail profissional'),
      'carlos@pad.local',
    )
    await user.type(screen.getByLabelText('Senha temporária'), 'Senha@123')
    await chooseOption(user, 'Perfil e permissões', /Medicina/)
    await user.click(screen.getByRole('button', { name: 'Cadastrar usuário' }))

    expect(mockedCreateUser).toHaveBeenCalledWith(
      {
        nome: 'Carlos Souza',
        email: 'carlos@pad.local',
        senha: 'Senha@123',
        papel: 'MEDICO',
      },
      expect.anything(),
    )
  })
})
