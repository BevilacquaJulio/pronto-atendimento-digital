import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { defaultRouteForRole, useAuth } from '../features/auth/auth-context'
import { ProtectedRoute } from '../features/auth/components/ProtectedRoute'

const LoginPage = lazy(() =>
  import('../features/auth/pages/LoginPage').then((module) => ({
    default: module.LoginPage,
  })),
)
const QueuePage = lazy(() =>
  import('../features/atendimentos/pages/QueuePage').then((module) => ({
    default: module.QueuePage,
  })),
)
const PatientsPage = lazy(() =>
  import('../features/pacientes/pages/PatientsPage').then((module) => ({
    default: module.PatientsPage,
  })),
)
const PatientDetailPage = lazy(() =>
  import('../features/pacientes/pages/PatientDetailPage').then((module) => ({
    default: module.PatientDetailPage,
  })),
)
const UsersPage = lazy(() =>
  import('../features/usuarios/pages/UsersPage').then((module) => ({
    default: module.UsersPage,
  })),
)
const ProfessionalRoomPage = lazy(() =>
  import('../features/sala/pages/ProfessionalRoomPage').then((module) => ({
    default: module.ProfessionalRoomPage,
  })),
)
const PatientRoomPage = lazy(() =>
  import('../features/sala/pages/PatientRoomPage').then((module) => ({
    default: module.PatientRoomPage,
  })),
)

function HomeRedirect() {
  const { user } = useAuth()
  return <Navigate to={user ? defaultRouteForRole(user.papel) : '/login'} replace />
}

function RouteLoader() {
  return (
    <div className="route-loader" role="status">
      <span aria-hidden="true" />
      Carregando ambiente
    </div>
  )
}

export function AppRouter() {
  return (
    <Suspense fallback={<RouteLoader />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/sala/:atendimentoId" element={<PatientRoomPage />} />

        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route
            path="/fila"
            element={
              <ProtectedRoute roles={['ENFERMEIRO', 'MEDICO']}>
                <QueuePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pacientes"
            element={
              <ProtectedRoute roles={['ENFERMEIRO', 'MEDICO']}>
                <PatientsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pacientes/:id"
            element={
              <ProtectedRoute roles={['ENFERMEIRO', 'MEDICO']}>
                <PatientDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/atendimentos/:id/sala"
            element={
              <ProtectedRoute roles={['ENFERMEIRO', 'MEDICO']}>
                <ProfessionalRoomPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/usuarios"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <UsersPage />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="/" element={<HomeRedirect />} />
        <Route path="*" element={<HomeRedirect />} />
      </Routes>
    </Suspense>
  )
}
