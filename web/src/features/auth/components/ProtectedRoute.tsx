import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { defaultRouteForRole, useAuth } from '../auth-context'
import type { Papel } from '../auth.types'

type ProtectedRouteProps = {
  children: ReactNode
  roles?: Papel[]
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (roles && !roles.includes(user.papel)) {
    return <Navigate to={defaultRouteForRole(user.papel)} replace />
  }

  return children
}
