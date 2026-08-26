import { zodResolver } from '@hookform/resolvers/zod'
import { UserPlusIcon } from '@phosphor-icons/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Alert } from '../../../components/ui/Alert'
import { Button } from '../../../components/ui/Button'
import { FormField } from '../../../components/ui/FormField'
import { Modal } from '../../../components/ui/Modal'
import { getApiErrorMessage } from '../../../lib/api'
import { registerPatient } from '../atendimentos.api'
import {
  patientIntakeFormSchema,
  toRegisterPatientInput,
  type PatientIntakeFormValues,
} from '../atendimentos.schema'
import type { AttendanceDetail } from '../atendimentos.types'

type PatientIntakePanelProps = {
  open: boolean
  onClose: () => void
  onCreated: (attendance: AttendanceDetail) => void
}

function todayForInput() {
  const today = new Date()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${today.getFullYear()}-${month}-${day}`
}

export function PatientIntakePanel({
  open,
  onClose,
  onCreated,
}: PatientIntakePanelProps) {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PatientIntakeFormValues>({
    resolver: zodResolver(patientIntakeFormSchema),
    defaultValues: { nome: '', cpf: '', contato: '', nascimento: '' },
  })

  const mutation = useMutation({
    mutationFn: (values: PatientIntakeFormValues) =>
      registerPatient(toRegisterPatientInput(values)),
    onSuccess: (attendance) => {
      void queryClient.invalidateQueries({ queryKey: ['queue'] })
      void queryClient.invalidateQueries({ queryKey: ['patients'] })
      reset()
      onCreated(attendance)
    },
  })

  const submit = handleSubmit((values) => mutation.mutate(values))

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="Novo paciente"
      title="Cadastrar paciente"
      description="Ao concluir, a pessoa entra na fila. A triagem começa quando o atendimento for iniciado."
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
            form="patient-intake-form"
            loading={mutation.isPending}
            icon={<UserPlusIcon size={17} />}
          >
            Cadastrar paciente
          </Button>
        </>
      }
    >
      <form className="intake-form" id="patient-intake-form" onSubmit={submit}>
        <FormField
          className="intake-form__full"
          label="Nome completo"
          autoComplete="name"
          error={errors.nome?.message}
          {...register('nome')}
        />
        <FormField
          label="CPF"
          inputMode="numeric"
          autoComplete="off"
          placeholder="000.000.000-00"
          error={errors.cpf?.message}
          {...register('cpf')}
        />
        <FormField
          label="Contato"
          type="tel"
          autoComplete="tel"
          placeholder="(11) 99999-9999"
          error={errors.contato?.message}
          {...register('contato')}
        />
        <FormField
          className="intake-form__full"
          label="Data de nascimento"
          type="date"
          min="1900-01-01"
          // Trava a data futura no próprio campo: validar só no submit deixa
          // o erro aparecer tarde, depois de digitar tudo.
          max={todayForInput()}
          autoComplete="bday"
          error={errors.nascimento?.message}
          {...register('nascimento')}
        />

        {mutation.isError ? (
          <div className="intake-form__full">
            <Alert tone="error">{getApiErrorMessage(mutation.error)}</Alert>
          </div>
        ) : null}
      </form>
    </Modal>
  )
}
