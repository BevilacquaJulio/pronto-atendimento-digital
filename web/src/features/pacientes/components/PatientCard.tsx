import {
  ArrowRightIcon,
  IdentificationCardIcon,
  PhoneIcon,
  UserFocusIcon,
} from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { Avatar } from '../../../components/ui/Avatar'
import { formatCpf, formatDate } from '../../../lib/format'
import type { PatientListItem } from '../pacientes.types'

/**
 * Card de paciente inteiramente clicável.
 *
 * O link cobre a superfície com `.link-card__overlay` (um `::after` que ocupa
 * o card), mas continua sendo uma `<a>` de verdade — mantém "abrir em nova
 * aba", teclado e leitor de tela. A alternativa comum, `onClick` numa `<div>`,
 * perde as três coisas.
 */
export function PatientCard({ patient }: { patient: PatientListItem }) {
  const attendances = patient._count.atendimentos

  return (
    <article className="link-card patient-card">
      <div className="patient-card__identity">
        <Avatar name={patient.nome} size="lg" />
        <div>
          <h2>
            <Link
              className="link-card__overlay row-link"
              to={`/pacientes/${patient.id}`}
            >
              {patient.nome}
            </Link>
          </h2>
          <p>Nascimento em {formatDate(patient.nascimento)}</p>
        </div>
      </div>

      <dl className="patient-card__details">
        <div>
          <dt>
            <IdentificationCardIcon size={15} aria-hidden="true" /> CPF
          </dt>
          <dd>{formatCpf(patient.cpf)}</dd>
        </div>
        <div>
          <dt>
            <PhoneIcon size={15} aria-hidden="true" /> Contato
          </dt>
          <dd>{patient.contato}</dd>
        </div>
      </dl>

      <div className="patient-card__footer">
        <span className="patient-card__count">
          <UserFocusIcon size={15} aria-hidden="true" />
          {attendances} {attendances === 1 ? 'atendimento' : 'atendimentos'}
        </span>
        <span className="patient-card__go" aria-hidden="true">
          Ver detalhes
          <ArrowRightIcon size={13} weight="bold" />
        </span>
      </div>
    </article>
  )
}
