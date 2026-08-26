import {
  ClipboardTextIcon,
  QueueIcon,
  ShieldCheckIcon,
  UserGearIcon,
  UsersThreeIcon,
  type Icon,
} from '@phosphor-icons/react'
import type { Papel } from '../../features/auth/auth.types'

export type NavigationItem = {
  to: string
  label: string
  description: string
  icon: Icon
  /** `true` quando a rota aceita subcaminhos (/pacientes/:id). */
  matchNested?: boolean
}

export type NavigationSection = {
  id: string
  label: string
  items: NavigationItem[]
}

/**
 * Menu por papel, declarado como dado e não como JSX condicional.
 *
 * Isso mantém a navegação auditável: dá para olhar este arquivo e responder
 * "o que a enfermagem enxerga?" sem ler componente. O controle de verdade
 * continua no backend — a matriz de acesso não é decidida no frontend.
 */
const navigationByRole: Record<Papel, NavigationSection[]> = {
  ENFERMEIRO: [
    {
      id: 'assistencial',
      label: 'Assistencial',
      items: [
        {
          to: '/fila',
          label: 'Fila de atendimentos',
          description: 'Demanda do turno',
          icon: QueueIcon,
        },
        {
          to: '/pacientes',
          label: 'Pacientes',
          description: 'Histórico autorizado',
          icon: UsersThreeIcon,
          matchNested: true,
        },
      ],
    },
  ],
  MEDICO: [
    {
      id: 'assistencial',
      label: 'Assistencial',
      items: [
        {
          to: '/fila',
          label: 'Fila de atendimentos',
          description: 'Encaminhamentos e retomadas',
          icon: QueueIcon,
        },
        {
          to: '/pacientes',
          label: 'Pacientes',
          description: 'Prontuário e evolução',
          icon: ClipboardTextIcon,
          matchNested: true,
        },
      ],
    },
  ],
  ADMIN: [
    {
      id: 'administracao',
      label: 'Administração',
      items: [
        {
          to: '/usuarios',
          label: 'Usuários e acessos',
          description: 'Perfis profissionais',
          icon: UserGearIcon,
        },
      ],
    },
  ],
}

export function navigationForRole(role: Papel): NavigationSection[] {
  return navigationByRole[role] ?? []
}

export { ShieldCheckIcon }
