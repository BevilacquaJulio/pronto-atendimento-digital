import { api } from '../../lib/api'
import type { Papel } from '../auth/auth.types'
import type {
  CreateUserInput,
  UserListItem,
  UsersResponse,
} from './usuarios.types'

export async function listUsers(search: string, role: Papel | '', page = 1) {
  const { data } = await api.get<UsersResponse>('/usuarios', {
    params: {
      busca: search.trim() || undefined,
      papel: role || undefined,
      pagina: page,
      porPagina: 15,
    },
  })
  return data
}

export async function setUserActive(user: UserListItem) {
  const { data } = await api.patch<UserListItem>(`/usuarios/${user.id}`, {
    ativo: !user.ativo,
  })
  return data
}

export async function createUser(input: CreateUserInput) {
  const { data } = await api.post<UserListItem>('/usuarios', input)
  return data
}

export async function updateUserRole({
  id,
  papel,
}: Pick<UserListItem, 'id' | 'papel'>) {
  const { data } = await api.patch<UserListItem>(`/usuarios/${id}`, { papel })
  return data
}
