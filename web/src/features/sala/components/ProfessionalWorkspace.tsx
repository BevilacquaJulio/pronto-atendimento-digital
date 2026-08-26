import { SignOutIcon, WarningCircleIcon } from '@phosphor-icons/react'
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoConference,
} from '@livekit/components-react'
import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { RiskBadge } from '../../../components/ui/StatusBadge'
import { getApiErrorMessage } from '../../../lib/api'
import { formatCpf } from '../../../lib/format'
import type { AttendanceDetail } from '../../atendimentos/atendimentos.types'
import type { RoomAccess } from '../sala.types'
import { MedicalActions } from './MedicalActions'
import { NursingActions } from './NursingActions'
import { PatientInviteCard } from './PatientInviteCard'

type ProfessionalWorkspaceProps = {
  access: RoomAccess
  attendance: AttendanceDetail
  role: 'ENFERMEIRO' | 'MEDICO'
  onComplete: () => void
  onReview: () => void
  onReconnect: () => void
  reconnecting: boolean
  reconnectError: unknown
}

/**
 * Consulta em andamento: vídeo à esquerda, trabalho clínico à direita.
 *
 * Os dois lados convivem na mesma tela de propósito — obrigar o profissional a
 * sair do vídeo para registrar a triagem é o que produz prontuário escrito de
 * memória depois da consulta.
 */
export function ProfessionalWorkspace({
  access,
  attendance,
  role,
  onComplete,
  onReview,
  onReconnect,
  reconnecting,
  reconnectError,
}: ProfessionalWorkspaceProps) {
  const [disconnected, setDisconnected] = useState(false)

  return (
    <div className="conference-screen">
      <div className="room-workspace">
        <section className="conference-stage" aria-label="Videoconsulta">
          <LiveKitRoom
            key={access.token}
            token={access.token}
            serverUrl={access.url}
            connect
            audio
            video
            data-lk-theme="default"
            className="conference-room"
            onConnected={() => setDisconnected(false)}
            onDisconnected={() => setDisconnected(true)}
          >
            <VideoConference />
            <RoomAudioRenderer />
          </LiveKitRoom>

          {disconnected ? (
            <div className="conference-disconnected" role="alert">
              <WarningCircleIcon size={30} weight="duotone" aria-hidden="true" />
              <div>
                <strong>A videochamada foi encerrada</strong>
                <p>
                  O atendimento continua aberto. Revise as ações ou conecte-se
                  novamente.
                </p>
                {reconnectError ? (
                  <small>{getApiErrorMessage(reconnectError)}</small>
                ) : null}
              </div>
              <div className="conference-disconnected__actions">
                <Button type="button" onClick={onReview}>
                  Revisar atendimento
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  loading={reconnecting}
                  onClick={onReconnect}
                >
                  Reconectar
                </Button>
              </div>
            </div>
          ) : null}
        </section>

        <aside className="care-workspace" aria-label="Área assistencial">
          <header className="care-workspace__patient">
            <div>
              <p>Atendimento em andamento</p>
              <h1>{attendance.paciente.nome}</h1>
              <span>{formatCpf(attendance.paciente.cpf)}</span>
            </div>
            <RiskBadge risk={attendance.risco} />
          </header>

          <PatientInviteCard attendanceId={attendance.id} />

          {role === 'ENFERMEIRO' ? (
            <NursingActions attendance={attendance} onComplete={onComplete} />
          ) : (
            <MedicalActions attendance={attendance} onComplete={onComplete} />
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            icon={<SignOutIcon size={16} />}
            onClick={onReview}
          >
            Encerrar videochamada e revisar atendimento
          </Button>
        </aside>
      </div>
    </div>
  )
}
