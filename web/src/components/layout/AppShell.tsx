import {
  CaretDownIcon,
  ListIcon,
  SidebarSimpleIcon,
  SignOutIcon,
  UserCircleIcon,
  XIcon,
} from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../features/auth/auth-context'
import { useDisclosure } from '../../hooks/useDisclosure'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { formatRole } from '../../lib/format'
import { Avatar } from '../ui/Avatar'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import {
  DropdownItem,
  DropdownMenu,
  DropdownSeparator,
} from '../ui/DropdownMenu'
import { Breadcrumb } from './Breadcrumb'
import { crumbsForPath, greetingForHour } from './shell-helpers'
import { navigationForRole } from './navigation'
import { SidebarNav } from './SidebarNav'

const COLLAPSE_KEY = 'pad:sidebar-collapsed'

export function AppShell() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const isOnline = useOnlineStatus()
  const drawer = useDisclosure()
  const signOutConfirm = useDisclosure()
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(COLLAPSE_KEY) === 'true',
  )

  // Trocar de rota fecha o drawer. Sem isso, voltar pelo botão do navegador
  // deixa o menu aberto sobre a página nova.
  //
  // A dependência é `drawer.close` (memorizado em useDisclosure), nunca o
  // objeto `drawer`: ele é recriado a cada render, o efeito rodaria sempre e
  // fecharia o menu no mesmo ciclo em que ele abriu — o drawer nunca abriria.
  const closeDrawer = drawer.close
  useEffect(() => {
    closeDrawer()
  }, [location.pathname, closeDrawer])

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, String(collapsed))
  }, [collapsed])

  if (!user) return null

  const sections = navigationForRole(user.papel)
  const crumbs = crumbsForPath(location.pathname, sections)
  const firstName = user.nome.split(' ')[0]

  return (
    <div className={`app-layout ${collapsed ? 'is-collapsed' : ''}`}>
      <a className="skip-link" href="#conteudo-principal">
        Pular para o conteúdo
      </a>

      <aside className="sidebar">
        <SidebarNav sections={sections} />
        <button
          type="button"
          className="sidebar__collapse"
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          onClick={() => setCollapsed((current) => !current)}
        >
          <SidebarSimpleIcon size={16} aria-hidden="true" />
          <span>Recolher menu</span>
        </button>
      </aside>

      {/* ---- Drawer móvel ---- */}
      <div
        className={`mobile-overlay ${drawer.isOpen ? 'is-open' : ''}`}
        onClick={drawer.close}
        aria-hidden="true"
      />
      <aside
        className={`mobile-drawer ${drawer.isOpen ? 'is-open' : ''}`}
        aria-label="Menu de navegação"
        // `inert` retira o drawer fechado da ordem de tabulação; sem isso o
        // foco entra num painel invisível e o cursor "some" para o usuário.
        inert={!drawer.isOpen}
      >
        <button
          type="button"
          className="mobile-drawer__close"
          aria-label="Fechar menu"
          onClick={drawer.close}
        >
          <XIcon size={19} aria-hidden="true" />
        </button>
        <SidebarNav sections={sections} onNavigate={drawer.close} />
      </aside>

      <div className="app-main">
        <header className="topbar">
          <button
            type="button"
            className="icon-button topbar__menu-button"
            aria-label="Abrir menu"
            aria-expanded={drawer.isOpen}
            onClick={drawer.open}
          >
            <ListIcon size={21} aria-hidden="true" />
          </button>

          <div className="topbar__context">
            <Breadcrumb items={crumbs} />
            <p className="topbar__greeting">
              {greetingForHour(new Date())}, {firstName}
            </p>
          </div>

          <div className="topbar__actions">
            {!isOnline ? (
              <span className="connection-pill connection-pill--offline">
                Sem conexão
              </span>
            ) : null}

            <DropdownMenu
              triggerLabel={`Conta de ${user.nome}`}
              wide
              trigger={
                <span className="profile-trigger">
                  <Avatar name={user.nome} size="sm" />
                  <span className="profile-trigger__text">
                    <strong>{user.nome}</strong>
                    <small>{formatRole(user.papel)}</small>
                  </span>
                  <CaretDownIcon size={13} aria-hidden="true" />
                </span>
              }
            >
              <div className="menu-identity">
                <Avatar name={user.nome} />
                <span className="menu-identity__text">
                  <strong>{user.nome}</strong>
                  <span>{user.email}</span>
                </span>
              </div>
              <DropdownSeparator />
              <DropdownItem
                icon={<UserCircleIcon size={17} weight="duotone" />}
                description={formatRole(user.papel)}
                onSelect={() => undefined}
                disabled
              >
                Perfil de acesso
              </DropdownItem>
              <DropdownSeparator />
              <DropdownItem
                icon={<SignOutIcon size={17} />}
                tone="danger"
                onSelect={signOutConfirm.open}
              >
                Encerrar sessão
              </DropdownItem>
            </DropdownMenu>
          </div>
        </header>

        <main className="app-content" id="conteudo-principal">
          <Outlet />
        </main>
      </div>

      <ConfirmDialog
        open={signOutConfirm.isOpen}
        eyebrow="Sessão"
        title="Encerrar sessão?"
        description="Você precisará entrar novamente com suas credenciais profissionais."
        consequences={[
          'Atendimentos em andamento continuam abertos e vinculados a você.',
          'Convites de sala já gerados seguem válidos até expirarem.',
        ]}
        confirmLabel="Encerrar sessão"
        cancelLabel="Continuar trabalhando"
        tone="danger"
        onConfirm={signOut}
        onCancel={signOutConfirm.close}
      />
    </div>
  )
}
