import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../auth-context'
import type { AuthUser } from '../auth.types'
import { ProtectedRoute } from './ProtectedRoute'

function renderProtectedRoute(user: AuthUser | null, roles?: AuthUser['papel'][]) {
  const auth: AuthContextValue = {
    user,
    token: user ? 'token-teste' : null,
    signIn: vi.fn(),
    signOut: vi.fn(),
  }

  return render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={['/restrito']}>
        <Routes>
          <Route path="/login" element={<p>Tela de login</p>} />
          <Route path="/fila" element={<p>Fila profissional</p>} />
          <Route path="/usuarios" element={<p>Administração de usuários</p>} />
          <Route
            path="/restrito"
            element={
              <ProtectedRoute roles={roles}>
                <p>Conteúdo autorizado</p>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

const doctor: AuthUser = {
  id: 'medico-1',
  nome: 'Carla Nogueira',
  email: 'carla.nogueira@pad.local',
  papel: 'MEDICO',
}

describe('ProtectedRoute', () => {
  it('direciona uma sessão ausente para o login', () => {
    renderProtectedRoute(null)

    expect(screen.getByText('Tela de login')).toBeInTheDocument()
  })

  it('permite o acesso quando o papel está autorizado', () => {
    renderProtectedRoute(doctor, ['MEDICO', 'ENFERMEIRO'])

    expect(screen.getByText('Conteúdo autorizado')).toBeInTheDocument()
  })

  it('direciona um papel não autorizado para sua área padrão', () => {
    renderProtectedRoute({ ...doctor, papel: 'ADMIN' }, ['MEDICO'])

    expect(screen.getByText('Administração de usuários')).toBeInTheDocument()
    expect(screen.queryByText('Conteúdo autorizado')).not.toBeInTheDocument()
  })
})
