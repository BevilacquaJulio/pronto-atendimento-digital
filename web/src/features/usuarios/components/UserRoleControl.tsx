import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Alert } from '../../../components/ui/Alert'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { Select } from '../../../components/ui/Select'
import { useToast } from '../../../components/ui/toast-context'
import { getApiErrorMessage } from '../../../lib/api'
import { formatRole } from '../../../lib/format'
import type { Papel } from '../../auth/auth.types'
import { roleOptions, rolePermissions } from '../role-options'
import { updateUserRole } from '../usuarios.api'
import type { UserListItem } from '../usuarios.types'

/**
 * Troca de perfil com confirmação.
 *
 * Antes a mutação disparava no `onChange` do select: um clique errado numa
 * linha promovia alguém a administrador sem nenhuma etapa intermediária.
 * Mudança de privilégio é ação sensível e merece o mesmo tratamento de uma
 * exclusão — inclusive porque o log de auditoria vai registrar o nome de quem
 * confirmou.
 */
export function UserRoleControl({ user }: { user: UserListItem }) {
  const queryClient = useQueryClient()
  const { notify } = useToast()
  const [pendingRole, setPendingRole] = useState<Papel | null>(null)

  const mutation = useMutation({
    mutationFn: updateUserRole,
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['users'] })
      setPendingRole(null)
      notify({
        tone: 'success',
        title: 'Perfil atualizado',
        description: `${user.nome} agora tem o perfil ${formatRole(variables.papel)}.`,
      })
    },
  })

  const gains = pendingRole
    ? rolePermissions[pendingRole]
        .filter((permission) => permission.allowed)
        .map((permission) => permission.text)
    : []

  return (
    <div className="user-role-control">
      <Select
        label={`Perfil de ${user.nome}`}
        hideLabel
        size="sm"
        variant="ghost"
        value={user.papel}
        options={roleOptions}
        disabled={mutation.isPending}
        onChange={(papel) => {
          if (papel !== user.papel) setPendingRole(papel)
        }}
      />

      <ConfirmDialog
        open={pendingRole !== null}
        eyebrow="Controle de acesso"
        title={`Alterar o perfil de ${user.nome}?`}
        description={
          pendingRole
            ? `De ${formatRole(user.papel)} para ${formatRole(pendingRole)}. A mudança vale no próximo acesso.`
            : ''
        }
        consequences={gains}
        confirmLabel="Alterar perfil"
        cancelLabel="Manter perfil atual"
        tone="warning"
        loading={mutation.isPending}
        error={
          mutation.isError ? (
            <Alert tone="error" compact>
              {getApiErrorMessage(mutation.error)}
            </Alert>
          ) : null
        }
        onConfirm={() =>
          pendingRole && mutation.mutate({ id: user.id, papel: pendingRole })
        }
        onCancel={() => setPendingRole(null)}
      />
    </div>
  )
}
