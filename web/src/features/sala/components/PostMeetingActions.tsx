import { CheckCircleIcon, ClipboardTextIcon } from '@phosphor-icons/react'
import type { AttendanceDetail } from '../../atendimentos/atendimentos.types'
import { MedicalActions } from './MedicalActions'
import { NursingActions } from './NursingActions'

type PostMeetingActionsProps = {
  attendance: AttendanceDetail
  role: 'ENFERMEIRO' | 'MEDICO'
  meetingEnded: boolean
  onComplete: () => void
}

/**
 * Ações que sobrevivem ao fim da videochamada.
 *
 * A chamada cair não pode significar perder o atendimento: a triagem já
 * registrada e o vínculo com o paciente continuam, e a decisão assistencial
 * segue disponível até o encaminhamento ou a finalização.
 */
export function PostMeetingActions({
  attendance,
  role,
  meetingEnded,
  onComplete,
}: PostMeetingActionsProps) {
  return (
    <section
      className="post-meeting page-enter page-enter--2"
      aria-labelledby="post-meeting-title"
    >
      <header className="post-meeting__heading">
        <span aria-hidden="true">
          {meetingEnded ? (
            <CheckCircleIcon size={23} weight="duotone" />
          ) : (
            <ClipboardTextIcon size={23} weight="duotone" />
          )}
        </span>
        <div>
          <p>
            {meetingEnded
              ? 'Videochamada encerrada · atendimento aberto'
              : 'Atendimento em andamento'}
          </p>
          <h2 id="post-meeting-title">
            {meetingEnded
              ? 'Revise e conclua as ações assistenciais'
              : 'Ações do atendimento'}
          </h2>
          <small>
            A reunião pode terminar sem perder a triagem ou o vínculo com o
            paciente. Estas ações continuam disponíveis até o encaminhamento ou
            a finalização do atendimento.
          </small>
        </div>
      </header>

      {role === 'ENFERMEIRO' ? (
        <NursingActions attendance={attendance} onComplete={onComplete} />
      ) : (
        <MedicalActions attendance={attendance} onComplete={onComplete} />
      )}
    </section>
  )
}
