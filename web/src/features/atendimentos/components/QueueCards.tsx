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

type QueueCardsProps = {
  items: AttendanceListItem[]
  role: Papel
  pendingId?: string
  onAction: (item: AttendanceListItem) => void
}

/**
 * Mesma fila em formato de cartão para telas estreitas.
 *
 * É markup separado, não uma tabela com `display: block` — tabela reflowada no
 * celular perde a associação entre cabeçalho e célula, e o leitor de tela
 * passa a anunciar valores sem dizer do que são.
 */
export function QueueCards({ items, role, pendingId, onAction }: QueueCardsProps) {
  return (
    <div className="queue-cards">
      {items.map((item) => {
        const severity = waitSeverity(item.entradaFila, item.status)

        return (
          <article className="link-card queue-card" key={item.id}>
            <div className="queue-card__top">
              <div className="identity-cell">
                <Avatar name={item.paciente.nome} />
                <span className="identity-cell__text">
                  <Link
                    className="link-card__overlay row-link"
                    to={`/pacientes/${item.paciente.id}`}
                  >
                    {item.paciente.nome}
                  </Link>
                  <small>{formatCpf(item.paciente.cpf)}</small>
                </span>
              </div>
              <StatusBadge status={item.status} />
            </div>

            <div className="queue-card__badges">
              <RiskBadge risk={item.risco} />
              <span
                className={`queue-wait ${severity === 'normal' ? '' : `queue-wait--${severity}`}`}
              >
                <ClockIcon size={14} aria-hidden="true" />
                {timeInQueue(item.entradaFila)}
              </span>
              {item.encaminhadoDeId ? (
                <span className="queue-forwarded">
                  <ArrowsLeftRightIcon size={12} weight="bold" aria-hidden="true" />
                  Encaminhado
                </span>
              ) : null}
            </div>

            <dl className="queue-card__facts">
              <div>
                <dt>Contato</dt>
                <dd>{item.paciente.contato}</dd>
              </div>
              <div>
                <dt>Entrada na fila</dt>
                <dd>{formatDateTime(item.entradaFila)}</dd>
              </div>
            </dl>

            <div className="link-card__raised">
              <Button
                type="button"
                variant={
                  item.status === 'AGUARDANDO' || canForwardToDoctor(item, role)
                    ? 'primary'
                    : 'secondary'
                }
                size="sm"
                block
                loading={pendingId === item.id}
                icon={
                  item.status === 'AGUARDANDO' ? (
                    <PlayIcon size={15} weight="fill" />
                  ) : (
                    <ArrowRightIcon size={15} />
                  )
                }
                onClick={() => onAction(item)}
              >
                {primaryActionLabel(item, role)}
              </Button>
            </div>
          </article>
        )
      })}
    </div>
  )
}
