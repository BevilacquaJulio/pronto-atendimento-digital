import { createContext, useContext } from 'react'
import type { AuthUser, AuthSession, Papel } from './auth.types'

export type AuthContextValue = {
  user: AuthUser | null
  token: string | null
  signIn: (session: AuthSession) => void
  signOut: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider')
  }
  return context
}

export function defaultRouteForRole(role: Papel) {
  return role === 'ADMIN' ? '/usuarios' : '/fila'
}
