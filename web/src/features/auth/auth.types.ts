export type Papel = 'ADMIN' | 'ENFERMEIRO' | 'MEDICO'

export type AuthUser = {
  id: string
  nome: string
  email: string
  papel: Papel
}

export type AuthSession = {
  token: string
  usuario: AuthUser
}

export type LoginInput = {
  email: string
  senha: string
}
