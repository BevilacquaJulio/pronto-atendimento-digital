import { ShieldCheckIcon } from '@phosphor-icons/react'
import { NavLink } from 'react-router-dom'
import { Logo } from '../brand/Logo'
import type { NavigationSection } from './navigation'

type SidebarNavProps = {
  sections: NavigationSection[]
  /** Contadores por rota — ex.: { '/fila': 3 }. */
  counts?: Record<string, number>
  /** Rotas cujo contador é crítico (fica vermelho). */
  alertRoutes?: string[]
  onNavigate?: () => void
}

/**
 * Conteúdo da navegação, compartilhado entre a sidebar fixa e o drawer móvel.
 * Um componente só evita o clássico "o menu do desktop tem um item que o do
 * celular não tem".
 */
export function SidebarNav({
  sections,
  counts = {},
  alertRoutes = [],
  onNavigate,
}: SidebarNavProps) {
  return (
    <>
      <div className="sidebar__brand">
        {/* Duas variantes em vez de uma que encolhe: com a sidebar recolhida
            sobra espaço só para o símbolo, e esconder o texto por CSS é mais
            barato que remontar o componente a cada transição. */}
        <Logo
          className="sidebar__brand-mark sidebar__brand-mark--full"
          variant="full"
          size={32}
          label="PAD — Pronto Atendimento Digital"
        />
        <Logo
          className="sidebar__brand-mark sidebar__brand-mark--compact"
          variant="mark"
          size={34}
        />
      </div>

      <nav className="sidebar__nav" aria-label="Navegação principal">
        {sections.map((section) => (
          <div key={section.id}>
            <p className="sidebar__section-label">{section.label}</p>
            {section.items.map((item) => {
              const count = counts[item.to] ?? 0
              const isAlert = alertRoutes.includes(item.to)
              const NavigationIcon = item.icon

              return (
                <NavLink
                  className={({ isActive }) =>
                    `sidebar-link ${isActive ? 'is-active' : ''}`
                  }
                  to={item.to}
                  key={item.to}
                  end={!item.matchNested}
                  onClick={onNavigate}
                >
                  <span className="sidebar-link__icon" aria-hidden="true">
                    <NavigationIcon size={19} weight="duotone" />
                  </span>
                  <span className="sidebar-link__text">
                    <strong>{item.label}</strong>
                    <small>{item.description}</small>
                  </span>
                  {count > 0 ? (
                    <span
                      className={`sidebar-link__count ${isAlert ? 'sidebar-link__count--alert' : ''}`}
                    >
                      {/* O número sozinho não diz do que se trata para quem
                          usa leitor de tela; o texto oculto completa. */}
                      <span aria-hidden="true">{count}</span>
                      <span className="sr-only">
                        {count} {isAlert ? 'de alta prioridade' : 'em espera'}
                      </span>
                    </span>
                  ) : null}
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar__footer">
        <div className="sidebar__trust">
          <ShieldCheckIcon size={19} weight="duotone" aria-hidden="true" />
          <div>
            <strong>Ambiente protegido</strong>
            <span>Ações e acessos auditados</span>
          </div>
        </div>
      </div>
    </>
  )
}
