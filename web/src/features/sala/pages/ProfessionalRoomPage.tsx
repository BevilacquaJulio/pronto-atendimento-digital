import {
  ArrowLeftIcon,
  MicrophoneIcon,
  ShieldCheckIcon,
  VideoCameraIcon,
} from '@phosphor-icons/react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Alert } from '../../../components/ui/Alert'
import { Button } from '../../../components/ui/Button'
import { ErrorState, TableSkeleton } from '../../../components/ui/DataState'
import { RiskBadge } from '../../../components/ui/StatusBadge'
import { getApiErrorMessage } from '../../../lib/api'
import { formatCpf } from '../../../lib/format'
import { getAttendance } from '../../atendimentos/atendimentos.api'
import { useAuth } from '../../auth/auth-context'
import { PatientInviteCard } from '../components/PatientInviteCard'
import { PostMeetingActions } from '../components/PostMeetingActions'
import { ProfessionalWorkspace } from '../components/ProfessionalWorkspace'
import { createProfessionalRoomAccess } from '../sala.api'

export function ProfessionalRoomPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [meetingEnded, setMeetingEnded] = useState(false)

  const attendance = useQuery({
    queryKey: ['attendance', user?.id, id],
    queryFn: () => getAttendance(id),
    enabled: Boolean(id) && Boolean(user?.id),
  })

  const access = useMutation({
    mutationFn: () => createProfessionalRoomAccess(id),
  })

  const isClinical = user?.papel === 'ENFERMEIRO' || user?.papel === 'MEDICO'

  if (access.data && attendance.data && isClinical) {
    return (
      <ProfessionalWorkspace
        key={access.data.token}
        access={access.data}
        attendance={attendance.data}
        role={user.papel as 'ENFERMEIRO' | 'MEDICO'}
        onComplete={() => navigate('/fila')}
        onReview={() => {
          setMeetingEnded(true)
          access.reset()
        }}
        onReconnect={() => access.mutate()}
        reconnecting={access.isPending}
        reconnectError={access.error}
      />
    )
  }

  return (
    <div className="room-lobby">
      <div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          icon={<ArrowLeftIcon size={16} />}
          onClick={() => navigate('/fila')}
        >
          Voltar para a fila
        </Button>
      </div>

      {attendance.isLoading ? <TableSkeleton rows={4} /> : null}
      {attendance.isError ? (
        <ErrorState
          message={getApiErrorMessage(attendance.error)}
          onRetry={() => void attendance.refetch()}
        />
      ) : null}

      {attendance.data ? (
        <section className="room-lobby__card page-enter">
          <div className="room-lobby__visual" aria-hidden="true">
            <div className="brand-rings" />
            <span>
              <VideoCameraIcon size={30} weight="duotone" />
            </span>
          </div>

          <div className="room-lobby__content">
            <p>Sala de teleatendimento</p>
            <h1>{attendance.data.paciente.nome}</h1>

            <div className="room-patient-meta">
              <span>{formatCpf(attendance.data.paciente.cpf)}</span>
              <RiskBadge risk={attendance.data.risco} />
            </div>

            <div className="room-safety-note">
              <ShieldCheckIcon size={19} weight="duotone" aria-hidden="true" />
              <p>
                O acesso é individual, temporário e vinculado a este
                atendimento.
              </p>
            </div>

            {/* Lembrete de dispositivos antes de entrar: o "não te ouço" dos
                primeiros trinta segundos custa mais tempo de consulta do que
                qualquer outra falha da sala. */}
            <div className="device-check">
              <span className="device-check__item">
                <VideoCameraIcon size={14} aria-hidden="true" />
                Câmera será solicitada
              </span>
              <span className="device-check__item">
                <MicrophoneIcon size={14} aria-hidden="true" />
                Microfone será solicitado
              </span>
            </div>

            <PatientInviteCard attendanceId={attendance.data.id} />

            {access.isError ? (
              <Alert tone="error">{getApiErrorMessage(access.error)}</Alert>
            ) : null}

            <Button
              type="button"
              size="lg"
              loading={access.isPending}
              icon={<VideoCameraIcon size={18} weight="fill" />}
              onClick={() => access.mutate()}
            >
              Entrar na sala segura
            </Button>
            <small>
              Ao entrar, o navegador solicitará acesso à câmera e ao microfone.
            </small>
          </div>
        </section>
      ) : null}

      {attendance.data && isClinical ? (
        <PostMeetingActions
          attendance={attendance.data}
          role={user.papel as 'ENFERMEIRO' | 'MEDICO'}
          meetingEnded={meetingEnded}
          onComplete={() => navigate('/fila')}
        />
      ) : null}
    </div>
  )
}
