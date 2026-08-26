import { useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { setApiAccessToken } from '../../lib/api'
import type { AuthSession } from './auth.types'
import { AuthContext } from './auth-context'

const SESSION_KEY = 'pad.session'

function readStoredSession(): AuthSession | null {
  try {
    const value = sessionStorage.getItem(SESSION_KEY)
    return value ? (JSON.parse(value) as AuthSession) : null
  } catch {
    sessionStorage.removeItem(SESSION_KEY)
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [session, setSession] = useState<AuthSession | null>(() => {
    const stored = readStoredSession()
    setApiAccessToken(stored?.token ?? null)
    return stored
  })

  function descartarCacheDaSessao() {
    // O QueryClient sobrevive à troca de usuário. As chaves da fila e do
    // paciente não incluem o profissional, então o GET da Ana ainda fresco
    // (staleTime 20s) seria pintado na tela do Bruno até o próximo refetch.
    // Cancelar marca as queries em voo para o resultado não voltar ao cache.
    void queryClient.cancelQueries()
    queryClient.clear()
  }

  function signIn(nextSession: AuthSession) {
    descartarCacheDaSessao()
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(nextSession))
    setApiAccessToken(nextSession.token)
    setSession(nextSession)
  }

  function signOut() {
    descartarCacheDaSessao()
    sessionStorage.removeItem(SESSION_KEY)
    setApiAccessToken(null)
    setSession(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user: session?.usuario ?? null,
        token: session?.token ?? null,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
