import {
  ArrowLeftIcon,
  CalendarBlankIcon,
  IdentificationCardIcon,
  PhoneIcon,
} from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import {
  EmptyState,
  ErrorState,
  TableSkeleton,
} from '../../../components/ui/DataState'
import { getApiErrorMessage } from '../../../lib/api'
import { formatCpf, formatDate, initials } from '../../../lib/format'
import { useAuth } from '../../auth/auth-context'
import { CareTimelineEntry } from '../components/CareTimelineEntry'
import { getPatient } from '../pacientes.api'

export function PatientDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const patient = useQuery({
    queryKey: ['patient', user?.id, id],
    queryFn: () => getPatient(id),
    enabled: Boolean(id) && Boolean(user?.id),
  })

  if (patient.isLoading) return <TableSkeleton rows={7} />

  if (patient.isError) {
    return (
      <ErrorState
        message={getApiErrorMessage(patient.error)}
        onRetry={() => void patient.refetch()}
      />
    )
  }

  if (!patient.data) return null

  const { nome, cpf, nascimento, contato, atendimentos } = patient.data

  return (
    <div className="page-stack">
      <div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          icon={<ArrowLeftIcon size={16} />}
          onClick={() => navigate('/pacientes')}
        >
          Voltar para pacientes
        </Button>
      </div>

      <section className="patient-profile page-enter">
        <div className="patient-profile__main">
          <span className="patient-profile__avatar" aria-hidden="true">
            {initials(nome)}
          </span>
          <div className="patient-profile__copy">
            <p>Detalhes do paciente</p>
            <h1>{nome}</h1>
            <p className="patient-profile__status">
              Acesso autorizado para o seu perfil profissional.
            </p>
          </div>
        </div>

        <dl className="patient-profile__facts">
          <div>
            <dt>
              <IdentificationCardIcon size={14} aria-hidden="true" /> CPF
            </dt>
            <dd>{formatCpf(cpf)}</dd>
          </div>
          <div>
            <dt>
              <CalendarBlankIcon size={14} aria-hidden="true" /> Nascimento
            </dt>
            <dd>{formatDate(nascimento)}</dd>
          </div>
          <div>
            <dt>
              <PhoneIcon size={14} aria-hidden="true" /> Contato
            </dt>
            <dd>{contato}</dd>
          </div>
        </dl>
      </section>

      <section className="page-enter page-enter--1">
        <div className="section-heading">
          <div>
            <h2>Linha do cuidado</h2>
            <p>Atendimentos do mais recente para o mais antigo.</p>
          </div>
          <span className="tag tag--brand">
            {atendimentos.length}{' '}
            {atendimentos.length === 1 ? 'registro' : 'registros'}
          </span>
        </div>

        {atendimentos.length === 0 ? (
          <div className="panel">
            <EmptyState
              title="Nenhum atendimento registrado"
              description="Este paciente ainda não possui histórico assistencial."
            />
          </div>
        ) : (
          <div className="care-timeline">
            {atendimentos.map((attendance) => (
              <CareTimelineEntry attendance={attendance} key={attendance.id} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
