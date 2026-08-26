import { HeartbeatIcon } from '@phosphor-icons/react'
import type { Triage } from '../../atendimentos/atendimentos.types'
import { readVitals } from '../../prontuario/sinais-vitais'

/**
 * Resumo da triagem visto pelo médico que recebeu o encaminhamento.
 *
 * Fica acima do formulário porque é a informação que ele *recebe*, não a que
 * produz — e porque perguntar de novo ao paciente o que a enfermagem já
 * registrou é o tipo de retrabalho que a triagem existe para evitar.
 */
export function TriageReference({ triage }: { triage: Triage }) {
  const vitals = readVitals(triage).filter(
    (vital) => vital.status !== 'empty',
  )

  return (
    <div className="triage-reference">
      <p className="triage-reference__label">
        <HeartbeatIcon size={14} weight="duotone" aria-hidden="true" />
        Resumo da triagem
      </p>
      <p>{triage.queixa}</p>

      {vitals.length > 0 ? (
        <div className="triage-reference__vitals">
          {vitals.map((vital) => (
            <span key={vital.key}>
              {vital.label}: {vital.value}
              {vital.unit ? ` ${vital.unit}` : ''}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
