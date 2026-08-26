import type { Crumb } from './Breadcrumb'
import type { NavigationSection } from './navigation'

/** Rótulo do último segmento quando ele não é uma rota do menu. */
const nestedLabels: Record<string, string> = {
  sala: 'Sala de atendimento',
  atendimentos: 'Atendimentos',
}

/**
 * Monta a trilha a partir do caminho atual e do menu do papel.
 *
 * Fica fora do componente porque é lógica pura: dá para testar passando uma
 * string, sem renderizar nada.
 */
export function crumbsForPath(
  pathname: string,
  sections: NavigationSection[],
): Crumb[] {
  const items = sections.flatMap((section) => section.items)
  const root = items.find(
    (item) => pathname === item.to || pathname.startsWith(`${item.to}/`),
  )

  if (!root) return [{ label: 'PAD' }]

  const crumbs: Crumb[] = [{ label: root.label, to: root.to }]
  const rest = pathname.slice(root.to.length).split('/').filter(Boolean)

  if (rest.length > 0) {
    const last = rest[rest.length - 1]
    crumbs.push({ label: nestedLabels[last] ?? 'Detalhes' })
  }

  return crumbs
}

/**
 * Saudação pelo horário. Detalhe pequeno, mas o PAD roda em turno noturno e
 * "Bom dia" às três da manhã denuncia software que não pensou em quem usa.
 */
export function greetingForHour(now: Date): string {
  const hour = now.getHours()
  if (hour < 5) return 'Boa madrugada'
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}
