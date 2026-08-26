import {
  ArrowRightIcon,
  ClockIcon,
  StethoscopeIcon,
  UsersThreeIcon,
  WarningIcon,
  type Icon,
} from '@phosphor-icons/react'
import type { QueueSummary } from '../atendimentos.types'
import { scopeLabels, type QueueScope } from '../queue-helpers'

type MetricDefinition = {
  scope: QueueScope
  label: string
  hint: string
  icon: Icon
  value: (summary: QueueSummary) => number
  variant?: 'primary' | 'alert'
}

const metrics: MetricDefinition[] = [
  {
    scope: 'todos',
    label: 'No período',
    hint: 'Todos os atendimentos do recorte',
    icon: UsersThreeIcon,
    value: (summary) => summary.totalPeriodo,
    variant: 'primary',
  },
  {
    scope: 'aguardando',
    label: 'Em espera',
    hint: 'Aguardando acolhimento',
    icon: ClockIcon,
    value: (summary) => summary.aguardando,
  },
  {
    scope: 'em-andamento',
    label: 'Em atendimento',
    hint: 'Fichas abertas agora',
    icon: StethoscopeIcon,
    value: (summary) => summary.emAndamento,
  },
  {
    scope: 'prioridade',
    label: 'Alta prioridade',
    hint: 'Vermelho ou laranja em aberto',
    icon: WarningIcon,
    value: (summary) => summary.altaPrioridade,
    variant: 'alert',
  },
]

type QueueMetricsProps = {
  summary: QueueSummary
  activeScope: QueueScope
  onSelectScope: (scope: QueueScope) => void
}

/**
 * Painel de contadores que também é a navegação da fila.
 *
 * Cada card é um `<button aria-pressed>`: alterna um recorte, e o estado
 * pressionado diz qual está aplicado. Antes os números eram texto morto — dava
 * para ver que havia pacientes urgentes e não havia como chegar até eles.
 */
export function QueueMetrics({
  summary,
  activeScope,
  onSelectScope,
}: QueueMetricsProps) {
  return (
    <section
      className="metric-grid"
      aria-label="Resumo da fila — selecione para filtrar"
    >
      {metrics.map((metric, index) => {
        const value = metric.value(summary)
        const isActive = activeScope === metric.scope
        const MetricIcon = metric.icon
        // O vermelho só entra quando existe alguém de fato: card de alerta
        // marcando zero ensina a equipe a ignorar alerta.
        const showAlert = metric.variant === 'alert' && value > 0

        return (
          <button
            type="button"
            className={[
              'metric-card',
              'page-enter',
              `page-enter--${index + 1}`,
              metric.variant === 'primary' ? 'metric-card--primary' : '',
              showAlert ? 'metric-card--alert' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            key={metric.scope}
            aria-pressed={isActive}
            onClick={() =>
              onSelectScope(isActive && metric.scope !== 'todos' ? 'todos' : metric.scope)
            }
          >
            <span className="metric-card__top">
              <span className="metric-card__label">{metric.label}</span>
              <span className="metric-card__icon" aria-hidden="true">
                <MetricIcon size={19} weight="duotone" />
              </span>
            </span>

            <span className="metric-card__value">{value}</span>
            <span className="metric-card__hint">{metric.hint}</span>

            <span className="metric-card__action">
              {isActive ? 'Filtro aplicado' : `Ver ${scopeLabels[metric.scope].toLowerCase()}`}
              <ArrowRightIcon size={12} weight="bold" aria-hidden="true" />
            </span>
          </button>
        )
      })}
    </section>
  )
}
