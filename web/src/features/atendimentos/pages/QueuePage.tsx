import {
  ArrowRightIcon,
  BroomIcon,
  CalendarBlankIcon,
  StethoscopeIcon,
  UserPlusIcon,
} from '@phosphor-icons/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useDeferredValue, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert } from '../../../components/ui/Alert'
import { Button } from '../../../components/ui/Button'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { EmptyState, ErrorState, TableSkeleton } from '../../../components/ui/DataState'
import { FilterChips, type ActiveFilter } from '../../../components/ui/FilterChips'
import { Pagination } from '../../../components/ui/Pagination'
import { SearchInput } from '../../../components/ui/SearchInput'
import { Select } from '../../../components/ui/Select'
import { useToast } from '../../../components/ui/toast-context'
import { getApiErrorMessage } from '../../../lib/api'
import { useAuth } from '../../auth/auth-context'
import { listQueue, startAttendance, forwardAttendance } from '../atendimentos.api'
import type {
  AttendanceListItem,
  QueueFilters,
  QueueSummary,
} from '../atendimentos.types'
import { PatientIntakePanel } from '../components/PatientIntakePanel'
import { QueueCards } from '../components/QueueCards'
import { QueueMetrics } from '../components/QueueMetrics'
import { QueueTable } from '../components/QueueTable'
import {
  canForwardToDoctor,
  periodLabels,
  scopeLabels,
  scopeToFilters,
  type QueueScope,
} from '../queue-helpers'

const PER_PAGE = 10

const emptySummary: QueueSummary = {
  totalPeriodo: 0,
  aguardando: 0,
  emAndamento: 0,
  finalizados: 0,
  cancelados: 0,
  altaPrioridade: 0,
  semTriagem: 0,
}

const periodOptions = (
  Object.keys(periodLabels) as Array<QueueFilters['periodo']>
).map((value) => ({ value, label: periodLabels[value] }))

const scopeOptions = (Object.keys(scopeLabels) as QueueScope[]).map((value) => ({
  value,
  label: scopeLabels[value],
}))

export function QueuePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { notify } = useToast()

  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [scope, setScope] = useState<QueueScope>('todos')
  const [period, setPeriod] = useState<QueueFilters['periodo']>('hoje')
  const [page, setPage] = useState(1)
  const [intakeOpen, setIntakeOpen] = useState(false)
  const [forwarding, setForwarding] = useState<AttendanceListItem | null>(null)
  const role = user?.papel === 'MEDICO' ? 'MEDICO' : 'ENFERMEIRO'

  const filters: QueueFilters = {
    busca: deferredSearch.trim() || undefined,
    ...scopeToFilters(scope),
    periodo: period,
    pagina: page,
    porPagina: PER_PAGE,
  }

  const queue = useQuery({
    // O id do profissional entra na chave para um GET atrasado da sessão
    // anterior não gravar a fila da Ana em cima da do Bruno.
    queryKey: ['queue', user?.id, filters],
    queryFn: () => listQueue(filters),
    enabled: Boolean(user?.id),
    // Fila é dado que envelhece rápido: outro profissional pode assumir um
    // paciente enquanto esta aba está aberta.
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  })

  const startMutation = useMutation({
    mutationFn: startAttendance,
    onSuccess: (attendance) => {
      void queryClient.invalidateQueries({ queryKey: ['queue'] })
      navigate(`/atendimentos/${attendance.id}/sala`)
    },
  })

  const forwardMutation = useMutation({
    mutationFn: (item: AttendanceListItem) => forwardAttendance(item.id),
    onSuccess: (_created, item) => {
      void queryClient.invalidateQueries({ queryKey: ['queue'] })
      setForwarding(null)
      notify({
        tone: 'success',
        title: 'Paciente encaminhado',
        description: `${item.paciente.nome} entrou na fila médica.`,
      })
    },
  })

  const items = queue.data?.itens ?? []
  const summary = queue.data?.resumo ?? emptySummary
  const activeAttendance = queue.data?.atendimentoAtivo ?? null

  function changeFilter(apply: () => void) {
    apply()
    setPage(1)
  }

  function handleAction(item: AttendanceListItem) {
    if (item.status === 'AGUARDANDO') {
      startMutation.mutate(item.id)
      return
    }
    if (item.status === 'EM_ANDAMENTO') {
      navigate(`/atendimentos/${item.id}/sala`)
      return
    }
    if (canForwardToDoctor(item, role)) {
      setForwarding(item)
      return
    }
    navigate(`/pacientes/${item.paciente.id}`)
  }

  const activeFilters: ActiveFilter[] = [
    scope !== 'todos'
      ? {
          id: 'scope',
          label: 'Recorte',
          value: scopeLabels[scope],
          onRemove: () => changeFilter(() => setScope('todos')),
        }
      : null,
    period !== 'todos'
      ? {
          id: 'period',
          label: 'Período',
          value: periodLabels[period],
          onRemove: () => changeFilter(() => setPeriod('todos')),
        }
      : null,
    search
      ? {
          id: 'search',
          label: 'Busca',
          value: search,
          onRemove: () => changeFilter(() => setSearch('')),
        }
      : null,
  ].filter((filter): filter is ActiveFilter => filter !== null)

  function clearAllFilters() {
    setScope('todos')
    setPeriod('todos')
    setSearch('')
    setPage(1)
  }

  return (
    <div className="page-stack">
      <header className="page-heading page-enter">
        <div>
          <p className="page-heading__eyebrow">Operação assistencial</p>
          <h1>Fila de atendimentos</h1>
          <p className="page-heading__lead">
            Acompanhe a demanda do turno e conduza cada paciente com segurança.
          </p>
        </div>
        {user?.papel === 'ENFERMEIRO' ? (
          <div className="page-heading__actions">
            <Button
              type="button"
              icon={<UserPlusIcon size={17} weight="bold" />}
              onClick={() => setIntakeOpen(true)}
            >
              Cadastrar paciente
            </Button>
          </div>
        ) : null}
      </header>

      <QueueMetrics
        summary={summary}
        activeScope={scope}
        onSelectScope={(next) => changeFilter(() => setScope(next))}
      />

      {activeAttendance ? (
        <section className="active-banner page-enter" aria-label="Atendimento em andamento">
          <span className="active-banner__icon" aria-hidden="true">
            <StethoscopeIcon size={23} weight="duotone" />
          </span>
          <div className="active-banner__content">
            <p>Atendimento em andamento</p>
            <strong>{activeAttendance.paciente.nome}</strong>
            <small>
              Esta ficha continua acessível mesmo fora do período selecionado.
            </small>
          </div>
          <Button
            type="button"
            variant="accent"
            trailingIcon={<ArrowRightIcon size={15} weight="bold" />}
            onClick={() => navigate(`/atendimentos/${activeAttendance.id}/sala`)}
          >
            Retomar atendimento
          </Button>
        </section>
      ) : null}

      <section className="panel queue-panel page-enter page-enter--2">
        <div className="toolbar">
          <SearchInput
            label="Buscar atendimento"
            placeholder="Buscar por nome ou CPF"
            value={search}
            onChange={(value) => changeFilter(() => setSearch(value))}
          />
          <Select
            label="Filtrar por situação"
            hideLabel
            size="sm"
            value={scope}
            options={scopeOptions}
            onChange={(value) => changeFilter(() => setScope(value))}
          />
          <Select
            label="Filtrar por período"
            hideLabel
            size="sm"
            value={period}
            options={periodOptions}
            icon={<CalendarBlankIcon size={15} />}
            onChange={(value) => changeFilter(() => setPeriod(value))}
          />
        </div>

        <FilterChips filters={activeFilters} onClearAll={clearAllFilters} />

        {startMutation.isError ? (
          <div className="panel__body">
            <Alert tone="error" title="Não foi possível iniciar">
              {getApiErrorMessage(startMutation.error)}
            </Alert>
          </div>
        ) : null}

        {queue.isLoading ? (
          <div className="panel__body">
            <TableSkeleton rows={6} />
          </div>
        ) : null}

        {queue.isError ? (
          <ErrorState
            message={getApiErrorMessage(queue.error)}
            onRetry={() => void queue.refetch()}
          />
        ) : null}

        {queue.isSuccess && items.length === 0 ? (
          <EmptyState
            title="Nenhum atendimento encontrado"
            description={
              activeFilters.length > 0
                ? 'Os filtros ativos podem estar escondendo pacientes na fila.'
                : 'Nenhuma pessoa aguardando neste período.'
            }
            action={
              activeFilters.length > 0 ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  icon={<BroomIcon size={16} />}
                  onClick={clearAllFilters}
                >
                  Limpar filtros
                </Button>
              ) : null
            }
          />
        ) : null}

        {queue.isSuccess && items.length > 0 ? (
          <>
            <QueueTable
              items={items}
              role={role}
              pendingId={
                startMutation.isPending
                  ? startMutation.variables
                  : forwardMutation.isPending
                    ? forwardMutation.variables?.id
                    : undefined
              }
              onAction={handleAction}
            />
            <QueueCards
              items={items}
              role={role}
              pendingId={
                startMutation.isPending
                  ? startMutation.variables
                  : forwardMutation.isPending
                    ? forwardMutation.variables?.id
                    : undefined
              }
              onAction={handleAction}
            />
            <Pagination
              page={queue.data.pagina}
              totalPages={queue.data.paginas}
              totalItems={queue.data.total}
              itemLabel="no filtro atual"
              onChange={setPage}
            />
          </>
        ) : null}
      </section>

      <p className="page-note">
        <StethoscopeIcon size={15} aria-hidden="true" />
        Perfil ativo: {user?.papel === 'MEDICO' ? 'Medicina' : 'Enfermagem'}
      </p>

      <PatientIntakePanel
        open={intakeOpen}
        onClose={() => setIntakeOpen(false)}
        onCreated={(attendance) => {
          setIntakeOpen(false)
          clearAllFilters()
          notify({
            tone: 'success',
            title: 'Paciente cadastrado',
            description: `${attendance.paciente.nome} entrou na fila e aguarda o início do atendimento.`,
          })
        }}
      />

      <ConfirmDialog
        open={forwarding !== null}
        eyebrow="Decisão assistencial"
        title="Encaminhar para a fila médica?"
        description="A etapa de enfermagem já foi encerrada. Uma nova ficha entra na fila do médico com a triagem já registrada."
        consequences={[
          'O atendimento de enfermagem permanece finalizado.',
          'O paciente volta a aguardar — agora na fila médica.',
          'A triagem segue visível para o médico que assumir.',
        ]}
        confirmLabel="Encaminhar paciente"
        cancelLabel="Voltar"
        tone="warning"
        loading={forwardMutation.isPending}
        error={
          forwardMutation.isError ? (
            <Alert tone="error" compact>
              {getApiErrorMessage(forwardMutation.error)}
            </Alert>
          ) : null
        }
        onConfirm={() => forwarding && forwardMutation.mutate(forwarding)}
        onCancel={() => {
          if (!forwardMutation.isPending) setForwarding(null)
        }}
      />
    </div>
  )
}
