import { formatDateTime } from '../../lib/format'
import type { PatientAttendance } from './pacientes.types'

export type AttendanceStageTone =
  | 'registered'
  | 'pending'
  | 'triaged'
  | 'completed'
  | 'canceled'

export type CareEventKind =
  | 'registered'
  | 'triage'
  | 'triage-pending'
  | 'completed'
  | 'canceled'

export type CareEvent = {
  id: string
  kind: CareEventKind
  tone: AttendanceStageTone
  eyebrow: string
  title: string
  description: string
  at: string
  metadata: Array<{ label: string; value: string }>
}

function startDiffersFromRegistration(attendance: PatientAttendance) {
  if (!attendance.iniciadoEm) return false
  const entry = new Date(attendance.entradaFila).getTime()
  const start = new Date(attendance.iniciadoEm).getTime()
  return Math.abs(start - entry) >= 60_000
}

function triageMetadata(attendance: PatientAttendance) {
  const rows: CareEvent['metadata'] = []
  if (attendance.profissional) {
    rows.push({ label: 'Responsável', value: attendance.profissional.nome })
  }
  if (startDiffersFromRegistration(attendance)) {
    rows.push({
      label: 'Atendimento iniciado',
      value: formatDateTime(attendance.iniciadoEm as string),
    })
  }
  return rows
}

/**
 * Quebra um atendimento em fatos, na ordem em que aconteceram.
 *
 * O status atual sozinho apagava o cadastro quando a triagem começava —
 * a ficha passava a parecer que a pessoa "nasceu" já em triagem. Cadastro
 * é um evento e triagem é outro; os dois precisam coexistir na linha.
 */
export function buildCareEvents(attendance: PatientAttendance): CareEvent[] {
  const events: CareEvent[] = [
    {
      id: `${attendance.id}-cadastro`,
      kind: 'registered',
      tone: 'registered',
      eyebrow: 'Cadastro',
      title: 'Paciente cadastrado',
      description:
        'Cadastro concluído e paciente incluído na fila de atendimento.',
      at: attendance.entradaFila,
      metadata: [],
    },
  ]

  if (attendance.status === 'AGUARDANDO') {
    return events
  }

  if (attendance.triagem) {
    events.push({
      id: `${attendance.id}-triagem`,
      kind: 'triage',
      tone: 'triaged',
      eyebrow: 'Triagem',
      title: 'Triagem de enfermagem',
      description: 'Queixa e sinais vitais registrados pela enfermagem.',
      at: attendance.triagem.criadoEm,
      metadata: triageMetadata(attendance),
    })
  } else {
    const pending = attendance.status === 'EM_ANDAMENTO'
    events.push({
      id: `${attendance.id}-triagem`,
      kind: 'triage-pending',
      tone: pending ? 'pending' : 'canceled',
      eyebrow: 'Triagem',
      title: pending ? 'Triagem pendente' : 'Triagem não realizada',
      description: pending
        ? 'Atendimento iniciado. Aguardando o registro da queixa e dos sinais vitais.'
        : 'Este atendimento foi encerrado sem registro de triagem.',
      at: attendance.iniciadoEm ?? attendance.entradaFila,
      metadata: triageMetadata(attendance),
    })
  }

  if (attendance.status === 'FINALIZADO') {
    events.push({
      id: `${attendance.id}-fim`,
      kind: 'completed',
      tone: 'completed',
      eyebrow: 'Encerramento',
      title: 'Atendimento finalizado',
      description: attendance.triagem
        ? 'Atendimento concluído com triagem registrada.'
        : 'Atendimento concluído sem registro de triagem.',
      at: attendance.finalizadoEm ?? attendance.entradaFila,
      metadata: attendance.finalizadoEm
        ? [
            {
              label: 'Encerramento',
              value: formatDateTime(attendance.finalizadoEm),
            },
          ]
        : [],
    })
  }

  if (attendance.status === 'CANCELADO') {
    events.push({
      id: `${attendance.id}-fim`,
      kind: 'canceled',
      tone: 'canceled',
      eyebrow: 'Encerramento',
      title: 'Atendimento cancelado',
      description: 'Atendimento cancelado antes da conclusão.',
      at: attendance.canceladoEm ?? attendance.entradaFila,
      metadata: attendance.canceladoEm
        ? [
            {
              label: 'Cancelamento',
              value: formatDateTime(attendance.canceladoEm),
            },
          ]
        : [],
    })
  }

  return events
}
