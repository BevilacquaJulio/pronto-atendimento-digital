import { WarningCircleIcon } from '@phosphor-icons/react'
import type { Triage } from '../../atendimentos/atendimentos.types'
import { readVitals } from '../sinais-vitais'

/**
 * Sinais vitais com faixa de referência ao lado do valor.
 *
 * O número sozinho ("38.6") exige que quem lê carregue a faixa de cabeça; com
 * a referência impressa, a conferência é imediata — inclusive para quem está
 * cobrindo um plantão fora da sua especialidade.
 */
export function VitalSigns({ triage }: { triage: Triage }) {
  const vitals = readVitals(triage)
  const hasAlert = vitals.some((vital) => vital.status === 'alert')

  return (
    <>
      <dl className="vitals-grid">
        {vitals.map((vital) => (
          <div
            className={`vital ${vital.status === 'normal' ? '' : `vital--${vital.status}`}`}
            key={vital.key}
          >
            <dt>{vital.label}</dt>
            <dd>
              {vital.value}
              {vital.unit ? <small>{vital.unit}</small> : null}
              {vital.status === 'alert' ? (
                <span className="sr-only"> — fora da faixa de referência</span>
              ) : null}
            </dd>
            <span className="vital__range">Referência: {vital.reference}</span>
          </div>
        ))}
      </dl>

      {hasAlert ? (
        <p className="page-note" style={{ marginTop: 'var(--space-3)' }}>
          <WarningCircleIcon size={14} aria-hidden="true" />
          Valores destacados estão fora da faixa de referência para adultos em
          repouso. Sinalização de apoio — a interpretação é do profissional.
        </p>
      ) : null}
    </>
  )
}
