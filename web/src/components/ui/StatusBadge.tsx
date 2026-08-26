import type {
  Risco,
  StatusAtendimento,
} from '../../features/atendimentos/atendimentos.types'
import {
  riskColorNames,
  riskLabels,
  statusLabels,
} from '../../features/atendimentos/rotulos'

export function StatusBadge({ status }: { status: StatusAtendimento }) {
  return (
    <span className={`status-badge status-badge--${status.toLowerCase()}`}>
      {statusLabels[status]}
    </span>
  )
}

/**
 * Classificação de risco. A cor é normativa (Manchester) e o rótulo escrito
 * acompanha sempre — cor sozinha não é canal acessível de informação clínica.
 */
export function RiskBadge({ risk }: { risk: Risco | null }) {
  if (!risk) {
    return (
      <span className="risk-badge risk-badge--pending">
        <span className="risk-badge__dot" aria-hidden="true" />
        Sem triagem
      </span>
    )
  }

  return (
    <span
      className={`risk-badge risk-badge--${risk.toLowerCase()}`}
      // A equipe conversa em "o laranja da sala 2", não em "o muito urgente
      // da sala 2" — o nome da cor entra como texto de apoio.
      title={`Classificação ${riskColorNames[risk]} — ${riskLabels[risk]}`}
    >
      <span className="risk-badge__dot" aria-hidden="true" />
      {riskLabels[risk]}
    </span>
  )
}
