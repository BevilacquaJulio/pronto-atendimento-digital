import { ShieldCheckIcon, UsersThreeIcon } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { useDeferredValue, useState } from 'react'
import {
  EmptyState,
  ErrorState,
  TableSkeleton,
} from '../../../components/ui/DataState'
import { Pagination } from '../../../components/ui/Pagination'
import { SearchInput } from '../../../components/ui/SearchInput'
import { getApiErrorMessage } from '../../../lib/api'
import { useAuth } from '../../auth/auth-context'
import { PatientCard } from '../components/PatientCard'
import { listPatients } from '../pacientes.api'

export function PatientsPage() {
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [page, setPage] = useState(1)

  const patients = useQuery({
    queryKey: ['patients', user?.id, deferredSearch, page],
    queryFn: () => listPatients(deferredSearch, page),
    enabled: Boolean(user?.id),
  })

  const items = patients.data?.itens ?? []

  return (
    <div className="page-stack">
      <header className="page-heading page-enter">
        <div>
          <p className="page-heading__eyebrow">Cadastro assistencial</p>
          <h1>Pacientes</h1>
          <p className="page-heading__lead">
            Consulte dados e histórico dentro do seu escopo de atuação.
          </p>
        </div>
        <div className="page-heading__actions">
          <span className="tag tag--brand">
            <UsersThreeIcon size={15} aria-hidden="true" />
            {patients.data?.total ?? 0} pacientes acessíveis
          </span>
        </div>
      </header>

      <section className="panel page-enter page-enter--1">
        <div className="toolbar">
          <SearchInput
            label="Buscar paciente"
            placeholder="Buscar por nome ou CPF"
            value={search}
            onChange={(value) => {
              setSearch(value)
              setPage(1)
            }}
          />
          <span className="toolbar__spacer" />
          {/*
            O aviso de escopo fica visível porque a lista *é* filtrada pelo
            vínculo assistencial. Sem esse recado, um resultado curto parece
            base incompleta em vez de restrição de acesso funcionando.
          */}
          <span className="tag">
            <ShieldCheckIcon size={14} aria-hidden="true" />
            Resultados limitados aos vínculos autorizados
          </span>
        </div>

        {patients.isLoading ? (
          <div className="panel__body">
            <TableSkeleton rows={6} />
          </div>
        ) : null}

        {patients.isError ? (
          <ErrorState
            message={getApiErrorMessage(patients.error)}
            onRetry={() => void patients.refetch()}
          />
        ) : null}

        {patients.isSuccess && items.length === 0 ? (
          <EmptyState
            title="Nenhum paciente encontrado"
            description="Revise a busca ou consulte novamente após assumir um atendimento."
          />
        ) : null}

        {patients.isSuccess && items.length > 0 ? (
          <>
            <div className="patients-grid">
              {items.map((patient) => (
                <PatientCard patient={patient} key={patient.id} />
              ))}
            </div>
            <Pagination
              page={patients.data.pagina}
              totalPages={patients.data.paginas}
              totalItems={patients.data.total}
              itemLabel="pacientes"
              onChange={setPage}
            />
          </>
        ) : null}
      </section>
    </div>
  )
}
