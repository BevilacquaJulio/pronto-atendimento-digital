import { api } from '../../lib/api'
import type { AuthSession, LoginInput } from './auth.types'

export async function login(input: LoginInput) {
  const { data } = await api.post<AuthSession>('/auth/login', input)
  return data
}
