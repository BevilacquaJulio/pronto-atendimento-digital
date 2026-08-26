import { zodResolver } from '@hookform/resolvers/zod'
import { CheckIcon, ProhibitIcon, UserPlusIcon } from '@phosphor-icons/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Controller, useForm, useWatch } from 'react-hook-form'
import type { z } from 'zod'
import { Alert } from '../../../components/ui/Alert'
import { Button } from '../../../components/ui/Button'
import { FormField } from '../../../components/ui/FormField'
import { Modal } from '../../../components/ui/Modal'
import { Select } from '../../../components/ui/Select'
import { useToast } from '../../../components/ui/toast-context'
import { getApiErrorMessage } from '../../../lib/api'
import { roleOptions, rolePermissions } from '../role-options'
import { createUser } from '../usuarios.api'
import { createUserSchema } from '../usuarios.schema'

type CreateUserForm = z.infer<typeof createUserSchema>

type UserCreatePanelProps = {
  open: boolean
  onClose: () => void
}

export function UserCreatePanel({ open, onClose }: UserCreatePanelProps) {
  const queryClient = useQueryClient()
  const { notify } = useToast()

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { nome: '', email: '', senha: '', papel: 'ENFERMEIRO' },
  })

  // `useWatch` em vez de `watch`: só este trecho re-renderiza quando o papel
  // muda, em vez do formulário inteiro a cada tecla digitada.
  const selectedRole = useWatch({ control, name: 'papel' })

  const mutation = useMutation({
    mutationFn: createUser,
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['users'] })
      reset()
      onClose()
      notify({
        tone: 'success',
        title: 'Usuário cadastrado',
        description: `${variables.nome} já pode acessar o PAD.`,
      })
    },
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="Controle de acesso"
      title="Cadastrar profissional"
      description="O perfil define as permissões funcionais dentro do PAD."
      icon={<UserPlusIcon size={22} weight="duotone" />}
      dismissible={!mutation.isPending}
      footer={
        <>
          <Button
            type="button"
            variant="ghost"
            disabled={mutation.isPending}
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="user-create-form"
            loading={mutation.isPending}
            icon={<UserPlusIcon size={17} />}
          >
            Cadastrar usuário
          </Button>
        </>
      }
    >
      <form
        className="user-form"
        id="user-create-form"
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
      >
        <FormField
          label="Nome completo"
          autoComplete="name"
          error={errors.nome?.message}
          {...register('nome')}
        />
        <FormField
          label="E-mail profissional"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <FormField
          label="Senha temporária"
          type="password"
          autoComplete="new-password"
          hint="O profissional deve trocá-la no primeiro acesso."
          error={errors.senha?.message}
          {...register('senha')}
        />

        <Controller
          control={control}
          name="papel"
          render={({ field }) => (
            <Select
              label="Perfil e permissões"
              value={field.value}
              options={roleOptions}
              onChange={field.onChange}
            />
          )}
        />

        {/* Pré-visualização: o admin vê o efeito da escolha antes de salvar,
            em vez de descobrir pelo chamado de suporte. */}
        <div className="permission-preview">
          <strong>O que este perfil poderá fazer</strong>
          <ul>
            {rolePermissions[selectedRole].map((permission) => (
              <li
                className={permission.allowed ? '' : 'is-denied'}
                key={permission.text}
              >
                {permission.allowed ? (
                  <CheckIcon size={14} weight="bold" aria-hidden="true" />
                ) : (
                  <ProhibitIcon size={14} weight="bold" aria-hidden="true" />
                )}
                {permission.text}
              </li>
            ))}
          </ul>
        </div>

        {mutation.isError ? (
          <Alert tone="error">{getApiErrorMessage(mutation.error)}</Alert>
        ) : null}
      </form>
    </Modal>
  )
}
