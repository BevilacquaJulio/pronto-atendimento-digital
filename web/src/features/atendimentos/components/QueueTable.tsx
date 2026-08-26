import {
  ArrowRightIcon,
  ArrowsLeftRightIcon,
  ClockIcon,
  PlayIcon,
} from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { Avatar } from '../../../components/ui/Avatar'
import { Button } from '../../../components/ui/Button'
import { RiskBadge, StatusBadge } from '../../../components/ui/StatusBadge'
import { formatCpf, formatDateTime, timeInQueue } from '../../../lib/format'
import type { Papel } from '../../auth/auth.types'
import type { AttendanceListItem } from '../atendimentos.types'
import { canForwardToDoctor, primaryActionLabel, waitSeverity } from '../queue-helpers'

type QueueTableProps = {
  items: AttendanceListItem[]
  role: Papel
  pendingId?: string
  onAction: (item: AttendanceListItem) => void
}

/** Tempo de espera com destaque proporcional à demora. */
function WaitTime({ item }: { item: AttendanceListItem }) {
  const severity = waitSeverity(item.entradaFila, item.status)

  return (
    <span
      className={`queue-wait ${severity === 'normal' ? '' : `queue-wait--${severity}`}`}
    >
      <ClockIcon size={14} aria-hidden="true" />
      {timeInQueue(item.entradaFila)}
      {severity === 'critical' ? (
        <span className="sr-only">— espera acima de uma hora</span>
      ) : null}
    </span>
  )
}

export function QueueTable({ items, role, pendingId, onAction }: QueueTableProps) {
  return (
    <div className="data-table">
      <table>
        <thead>
          <tr>
            <th>Paciente</th>
            <th>Contato</th>
            <th>Classificação de risco</th>
            <th>Status</th>
            <th>Entrada na fila</th>
            <th>Tempo de espera</th>
            <th aria-label="Ações" />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                <div className="identity-cell">
                  <Avatar name={item.paciente.nome} size="sm" />
                  <span className="identity-cell__text">
                    {/* Link real, não onClick numa <tr>: permite abrir em nova
                        aba, copiar endereço e aparece na navegação por links
                        do leitor de tela. */}
                    <Link className="row-link" to={`/pacientes/${item.paciente.id}`}>
                      {item.paciente.nome}
                    </Link>
                    <small>{formatCpf(item.paciente.cpf)}</small>
                  </span>
                </div>
              </td>
              <td>
                <span className="queue-contact">{item.paciente.contato}</span>
              </td>
              <td>
                <RiskBadge risk={item.risco} />
                {item.encaminhadoDeId ? (
                  <span className="queue-forwarded">
                    <ArrowsLeftRightIcon size={12} weight="bold" aria-hidden="true" />
                    Encaminhado pela enfermagem
                  </span>
                ) : null}
              </td>
              <td>
                <StatusBadge status={item.status} />
              </td>
              <td>
                <span className="queue-entry">
                  {formatDateTime(item.entradaFila)}
                </span>
              </td>
              <td>
                <WaitTime item={item} />
              </td>
              <td>
                <Button
                  type="button"
                  variant={
                    item.status === 'AGUARDANDO' || canForwardToDoctor(item, role)
                      ? 'primary'
                      : 'secondary'
                  }
                  size="sm"
                  loading={pendingId === item.id}
                  icon={
                    item.status === 'AGUARDANDO' ? (
                      <PlayIcon size={14} weight="fill" />
                    ) : (
                      <ArrowRightIcon size={14} />
                    )
                  }
                  onClick={() => onAction(item)}
                >
                  {primaryActionLabel(item, role)}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
