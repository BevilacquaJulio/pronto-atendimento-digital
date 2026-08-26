import type { Papel } from '../auth/auth.types'

export type UserListItem = {
  id: string
  nome: string
  email: string
  papel: Papel
  ativo: boolean
  criadoEm: string
}

export type UsersResponse = {
  itens: UserListItem[]
  total: number
  pagina: number
  porPagina: number
  paginas: number
}

export type CreateUserInput = {
  nome: string
  email: string
  senha: string
  papel: Papel
}
