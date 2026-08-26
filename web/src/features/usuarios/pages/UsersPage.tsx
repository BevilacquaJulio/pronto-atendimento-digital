import {
  PlusIcon,
  ShieldCheckIcon,
  UserGearIcon,
  UsersThreeIcon,
} from '@phosphor-icons/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useDeferredValue, useState } from 'react'
import { Alert } from '../../../components/ui/Alert'
import { Avatar } from '../../../components/ui/Avatar'
import { Button } from '../../../components/ui/Button'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import {
  EmptyState,
  ErrorState,
  TableSkeleton,
} from '../../../components/ui/DataState'
import { Pagination } from '../../../components/ui/Pagination'
import { SearchInput } from '../../../components/ui/SearchInput'
import { Select } from '../../../components/ui/Select'
import { useToast } from '../../../components/ui/toast-context'
import { getApiErrorMessage } from '../../../lib/api'
import { formatDate } from '../../../lib/format'
import { useAuth } from '../../auth/auth-context'
import type { Papel } from '../../auth/auth.types'
import { UserCreatePanel } from '../components/UserCreatePanel'
import { UserRoleControl } from '../components/UserRoleControl'
import { roleFilterOptions } from '../role-options'
import { listUsers, setUserActive } from '../usuarios.api'
import type { UserListItem } from '../usuarios.types'

export function UsersPage() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { notify } = useToast()

  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [role, setRole] = useState<Papel | ''>('')
  const [page, setPage] = useState(1)
  const [creatingUser, setCreatingUser] = useState(false)
  const [togglingUser, setTogglingUser] = useState<UserListItem | null>(null)

  const users = useQuery({
    queryKey: ['users', user?.id, deferredSearch, role, page],
    queryFn: () => listUsers(deferredSearch, role, page),
    enabled: Boolean(user?.id),
  })

  const activeMutation = useMutation({
    mutationFn: setUserActive,
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['users'] })
      setTogglingUser(null)
      notify({
        tone: 'success',
        title: variables.ativo ? 'Acesso desativado' : 'Acesso reativado',
        description: `${variables.nome} — alteração registrada.`,
      })
    },
  })

  const items = users.data?.itens ?? []
  const activeCount = items.filter((user) => user.ativo).length
  const clinicalCount = items.filter((user) => user.papel !== 'ADMIN').length

  return (
    <div className="page-stack">
      <header className="page-heading page-enter">
        <div>
          <p className="page-heading__eyebrow">Administração</p>
          <h1>Usuários e acessos</h1>
          <p className="page-heading__lead">
            Gerencie perfis profissionais sem acessar informações clínicas.
          </p>
        </div>
        <div className="page-heading__actions">
          <span className="tag">
            <ShieldCheckIcon size={14} aria-hidden="true" />
            Gestão de acesso restrita
          </span>
          <Button
            type="button"
            icon={<PlusIcon size={16} weight="bold" />}
            onClick={() => setCreatingUser(true)}
          >
            Novo usuário
          </Button>
        </div>
      </header>

      <section className="admin-summary page-enter page-enter--1">
        <article className="admin-stat">
          <span className="admin-stat__icon" aria-hidden="true">
            <UsersThreeIcon size={22} weight="duotone" />
          </span>
          <div className="admin-stat__text">
            <strong>{users.data?.total ?? 0}</strong>
            <span>usuários cadastrados</span>
          </div>
        </article>
        <article className="admin-stat">
          <span className="admin-stat__icon" aria-hidden="true">
            <ShieldCheckIcon size={22} weight="duotone" />
          </span>
          <div className="admin-stat__text">
            <strong>{activeCount}</strong>
            <span>ativos nesta página</span>
          </div>
        </article>
        <article className="admin-stat">
          <span className="admin-stat__icon" aria-hidden="true">
            <UserGearIcon size={22} weight="duotone" />
          </span>
          <div className="admin-stat__text">
            <strong>{clinicalCount}</strong>
            <span>profissionais clínicos nesta página</span>
          </div>
        </article>
      </section>

      <section className="panel users-panel page-enter page-enter--2">
        <div className="toolbar">
          <SearchInput
            label="Buscar usuário"
            placeholder="Buscar por nome ou e-mail"
            value={search}
            onChange={(value) => {
              setSearch(value)
              setPage(1)
            }}
          />
          <Select
            label="Filtrar por perfil"
            hideLabel
            size="sm"
            value={role}
            options={roleFilterOptions}
            onChange={(value) => {
              setRole(value)
              setPage(1)
            }}
          />
        </div>

        {users.isLoading ? (
          <div className="panel__body">
            <TableSkeleton rows={6} />
          </div>
        ) : null}

        {users.isError ? (
          <ErrorState
            message={getApiErrorMessage(users.error)}
            onRetry={() => void users.refetch()}
          />
        ) : null}

        {users.isSuccess && items.length === 0 ? (
          <EmptyState
            title="Nenhum usuário encontrado"
            description="Ajuste os filtros para consultar outros perfis."
          />
        ) : null}

        {users.isSuccess && items.length > 0 ? (
          <>
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>Profissional</th>
                    <th>Perfil</th>
                    <th>Cadastro</th>
                    <th>Situação</th>
                    <th aria-label="Ações" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="identity-cell">
                          <Avatar name={user.nome} size="sm" />
                          <span className="identity-cell__text">
                            <strong>{user.nome}</strong>
                            <small>{user.email}</small>
                          </span>
                        </div>
                      </td>
                      <td>
                        <UserRoleControl user={user} />
                      </td>
                      <td>{formatDate(user.criadoEm)}</td>
                      <td>
                        <span
                          className={`access-state ${user.ativo ? 'is-active' : 'is-inactive'}`}
                        >
                          {user.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td>
                        <Button
                          type="button"
                          variant={user.ativo ? 'danger-ghost' : 'secondary'}
                          size="sm"
                          onClick={() => setTogglingUser(user)}
                        >
                          {user.ativo ? 'Desativar' : 'Ativar'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="user-cards">
              {items.map((user) => (
                <article className="user-card" key={user.id}>
                  <div className="identity-cell">
                    <Avatar name={user.nome} />
                    <span className="identity-cell__text">
                      <strong>{user.nome}</strong>
                      <small>{user.email}</small>
                    </span>
                  </div>
                  <div className="user-card__meta">
                    <UserRoleControl user={user} />
                    <span
                      className={`access-state ${user.ativo ? 'is-active' : 'is-inactive'}`}
                    >
                      {user.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant={user.ativo ? 'danger-ghost' : 'secondary'}
                    size="sm"
                    block
                    onClick={() => setTogglingUser(user)}
                  >
                    {user.ativo ? 'Desativar acesso' : 'Ativar acesso'}
                  </Button>
                </article>
              ))}
            </div>

            <Pagination
              page={users.data.pagina}
              totalPages={users.data.paginas}
              totalItems={users.data.total}
              itemLabel="usuários"
              onChange={setPage}
            />
          </>
        ) : null}
      </section>

      <UserCreatePanel
        open={creatingUser}
        onClose={() => setCreatingUser(false)}
      />

      {/*
        Desativar acesso é a ação mais destrutiva desta tela: derruba um
        profissional no meio do turno. As consequências abaixo são específicas
        de propósito — "esta ação não pode ser desfeita" seria falso (dá para
        reativar) e treinaria o admin a clicar sem ler.
      */}
      <ConfirmDialog
        open={togglingUser !== null}
        eyebrow="Controle de acesso"
        title={
          togglingUser?.ativo
            ? `Desativar o acesso de ${togglingUser.nome}?`
            : `Reativar o acesso de ${togglingUser?.nome ?? ''}?`
        }
        description={
          togglingUser?.ativo
            ? 'O profissional perde o acesso ao PAD imediatamente.'
            : 'O profissional volta a acessar o PAD com o perfil atual.'
        }
        consequences={
          togglingUser?.ativo
            ? [
                'Novos logins passam a ser recusados.',
                'Atendimentos em andamento vinculados a esta pessoa continuam abertos e precisarão ser tratados.',
                'O acesso pode ser reativado depois, sem novo cadastro.',
              ]
            : ['O profissional volta a aparecer como disponível para atender.']
        }
        confirmLabel={togglingUser?.ativo ? 'Desativar acesso' : 'Reativar acesso'}
        cancelLabel="Cancelar"
        tone={togglingUser?.ativo ? 'danger' : 'default'}
        loading={activeMutation.isPending}
        error={
          activeMutation.isError ? (
            <Alert tone="error" compact>
              {getApiErrorMessage(activeMutation.error)}
            </Alert>
          ) : null
        }
        onConfirm={() => togglingUser && activeMutation.mutate(togglingUser)}
        onCancel={() => setTogglingUser(null)}
      />
    </div>
  )
}
