import type { Papel } from '../auth/auth.types'
import type {
  AttendanceListItem,
  QueueFilters,
  Risco,
  StatusAtendimento,
} from './atendimentos.types'

/**
 * Recortes prontos que os cards de métrica aplicam na fila.
 *
 * Ficam aqui, e não dentro do componente, porque a definição de "alta
 * prioridade" precisa ser a mesma que o backend usa para contar
 * (`resumirFila` em atendimento.service.ts). Duas definições divergentes
 * produziriam um card que mostra 3 e uma lista que devolve 5 — o tipo de
 * inconsistência que faz a equipe perder confiança no painel inteiro.
 */
export type QueueScope =
  | 'todos'
  | 'aguardando'
  | 'em-andamento'
  | 'finalizados'
  | 'cancelados'
  | 'prioridade'

export const HIGH_PRIORITY_RISKS: Risco[] = ['VERMELHO', 'LARANJA']

const OPEN_STATUSES: StatusAtendimento[] = ['AGUARDANDO', 'EM_ANDAMENTO']

export function scopeToFilters(
  scope: QueueScope,
): Pick<QueueFilters, 'status' | 'risco'> {
  switch (scope) {
    case 'aguardando':
      return { status: ['AGUARDANDO'] }
    case 'em-andamento':
      return { status: ['EM_ANDAMENTO'] }
    case 'finalizados':
      return { status: ['FINALIZADO'] }
    case 'cancelados':
      return { status: ['CANCELADO'] }
    case 'prioridade':
      return { status: OPEN_STATUSES, risco: HIGH_PRIORITY_RISKS }
    default:
      return {}
  }
}

export const periodLabels: Record<QueueFilters['periodo'], string> = {
  hoje: 'Hoje',
  ontem: 'Ontem',
  ultima_semana: 'Últimos 7 dias',
  todos: 'Todo o período',
}

export const scopeLabels: Record<QueueScope, string> = {
  todos: 'Todos os atendimentos',
  aguardando: 'Aguardando',
  'em-andamento': 'Em atendimento',
  finalizados: 'Finalizados',
  cancelados: 'Cancelados',
  prioridade: 'Alta prioridade em aberto',
}

/**
 * Severidade do tempo de espera.
 *
 * Os limiares são operacionais, não clínicos: 30 e 60 minutos são marcos de
 * gestão de fila, e o vermelho aqui significa "esta pessoa está esperando há
 * muito tempo", não "esta pessoa é grave" — gravidade é o badge de risco, que
 * vem da triagem. Misturar os dois faria a tela sugerir prioridade clínica
 * que ninguém avaliou.
 */
export function waitSeverity(
  enteredAt: string,
  status: StatusAtendimento,
): 'normal' | 'attention' | 'critical' {
  if (status !== 'AGUARDANDO') return 'normal'

  const minutes = (Date.now() - new Date(enteredAt).getTime()) / 60_000
  if (minutes >= 60) return 'critical'
  if (minutes >= 30) return 'attention'
  return 'normal'
}

/** Ação principal disponível para o item, segundo o estado dele. */
export function canForwardToDoctor(
  item: AttendanceListItem,
  role: Papel,
): boolean {
  return (
    role === 'ENFERMEIRO' &&
    item.status === 'FINALIZADO' &&
    item.risco !== null &&
    item.encaminhadoDeId === null &&
    item.encaminhadoPara === null
  )
}

export function primaryActionLabel(
  item: AttendanceListItem,
  role: Papel,
): string {
  if (item.status === 'AGUARDANDO') return 'Iniciar atendimento'
  if (item.status === 'EM_ANDAMENTO') return 'Ver atendimento'
  if (canForwardToDoctor(item, role)) return 'Encaminhar para médico'
  return 'Ver detalhes'
}
