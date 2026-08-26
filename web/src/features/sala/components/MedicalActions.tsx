import { zodResolver } from '@hookform/resolvers/zod'
import {
  CheckCircleIcon,
  FloppyDiskIcon,
  NotePencilIcon,
} from '@phosphor-icons/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'
import { Alert } from '../../../components/ui/Alert'
import { Button } from '../../../components/ui/Button'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { ErrorState, TableSkeleton } from '../../../components/ui/DataState'
import { TextAreaField } from '../../../components/ui/FormField'
import { useToast } from '../../../components/ui/toast-context'
import { getApiErrorMessage } from '../../../lib/api'
import { useAuth } from '../../auth/auth-context'
import { finalizeAttendance } from '../../atendimentos/atendimentos.api'
import type { AttendanceDetail } from '../../atendimentos/atendimentos.types'
import {
  createMedicalRecord,
  getMedicalRecord,
  updateMedicalRecord,
} from '../../prontuario/prontuario.api'
import { medicalRecordSchema } from '../../prontuario/prontuario.schema'
import type {
  MedicalRecord,
  MedicalRecordInput,
} from '../../prontuario/prontuario.types'
import { TriageReference } from './TriageReference'

type MedicalRecordForm = z.infer<typeof medicalRecordSchema>

type MedicalActionsProps = {
  attendance: AttendanceDetail
  onComplete: () => void
}

function toInput(values: MedicalRecordForm): MedicalRecordInput {
  return {
    anamnese: values.anamnese,
    conduta: values.conduta,
    prescricao: values.prescricao.trim() || null,
  }
}

export function MedicalActions({ attendance, onComplete }: MedicalActionsProps) {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { notify } = useToast()
  const [confirmingFinish, setConfirmingFinish] = useState(false)

  const recordQuery = useQuery({
    queryKey: ['medical-record', user?.id, attendance.id],
    queryFn: () => getMedicalRecord(attendance.id),
    enabled: Boolean(user?.id),
  })

  const {
    register,
    reset,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<MedicalRecordForm>({
    resolver: zodResolver(medicalRecordSchema),
    defaultValues: { anamnese: '', conduta: '', prescricao: '' },
  })

  useEffect(() => {
    if (recordQuery.data) {
      reset({
        anamnese: recordQuery.data.anamnese,
        conduta: recordQuery.data.conduta,
        prescricao: recordQuery.data.prescricao ?? '',
      })
    }
  }, [recordQuery.data, reset])

  function cacheRecord(record: MedicalRecord) {
    queryClient.setQueryData(
      ['medical-record', user?.id, attendance.id],
      record,
    )
  }

  async function persistRecord(values: MedicalRecordForm) {
    const input = toInput(values)
    return recordQuery.data
      ? updateMedicalRecord({ recordId: recordQuery.data.id, input })
      : createMedicalRecord({ attendanceId: attendance.id, input })
  }

  const save = useMutation({
    mutationFn: persistRecord,
    onSuccess: (record) => {
      cacheRecord(record)
      reset(
        {
          anamnese: record.anamnese,
          conduta: record.conduta,
          prescricao: record.prescricao ?? '',
        },
        // Reaproveita os valores salvos como novo baseline: sem isso o form
        // continuaria "sujo" e o aviso de alterações não salvas mentiria.
        { keepValues: true },
      )
      notify({ tone: 'success', title: 'Prontuário salvo' })
    },
  })

  const finish = useMutation({
    mutationFn: async (values: MedicalRecordForm) => {
      const record = await persistRecord(values)
      cacheRecord(record)
      return finalizeAttendance(attendance.id)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['queue'] })
      setConfirmingFinish(false)
      notify({
        tone: 'success',
        title: 'Atendimento finalizado',
        description: `Prontuário de ${attendance.paciente.nome} registrado.`,
      })
      onComplete()
    },
  })

  const triage = attendance.encaminhadoDe?.triagem ?? attendance.triagem
  const mutationError = save.error ?? finish.error

  if (recordQuery.isLoading) return <TableSkeleton rows={3} />
  if (recordQuery.isError) {
    return (
      <ErrorState
        message={getApiErrorMessage(recordQuery.error)}
        onRetry={() => void recordQuery.refetch()}
      />
    )
  }

  return (
    <section className="clinical-panel" aria-labelledby="medical-record-title">
      <header className="clinical-panel__heading">
        <span aria-hidden="true">
          <NotePencilIcon size={20} weight="duotone" />
        </span>
        <div>
          <h2 id="medical-record-title">Prontuário médico</h2>
          <p>Registre avaliação, conduta e prescrição durante a consulta.</p>
        </div>
      </header>

      {triage ? <TriageReference triage={triage} /> : null}

      <form
        className="clinical-form"
        onSubmit={handleSubmit((values) => save.mutate(values))}
      >
        <TextAreaField
          label="Anamnese"
          rows={5}
          placeholder="História clínica, queixa e evolução relatadas na consulta."
          error={errors.anamnese?.message}
          {...register('anamnese')}
        />
        <TextAreaField
          label="Conduta"
          rows={4}
          placeholder="Orientações, encaminhamentos e exames solicitados."
          error={errors.conduta?.message}
          {...register('conduta')}
        />
        <TextAreaField
          label="Prescrição"
          rows={4}
          placeholder="Medicamentos, posologia e duração. Deixe em branco se não houver."
          hint="Campo opcional."
          error={errors.prescricao?.message}
          {...register('prescricao')}
        />

        {mutationError ? (
          <Alert tone="error" compact>
            {getApiErrorMessage(mutationError)}
          </Alert>
        ) : null}

        {save.isSuccess && !isDirty ? (
          <p className="save-indicator" role="status">
            <CheckCircleIcon size={15} weight="fill" aria-hidden="true" />
            Prontuário salvo.
          </p>
        ) : null}

        <div className="clinical-actions">
          <Button
            type="submit"
            variant="secondary"
            loading={save.isPending}
            disabled={finish.isPending}
            icon={<FloppyDiskIcon size={17} />}
          >
            Salvar prontuário
          </Button>
          <Button
            type="button"
            loading={finish.isPending}
            disabled={save.isPending}
            icon={<CheckCircleIcon size={17} />}
            onClick={() => setConfirmingFinish(true)}
          >
            Salvar e finalizar
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={confirmingFinish}
        eyebrow="Encerramento"
        title="Finalizar o atendimento?"
        description="O prontuário é salvo e o atendimento é encerrado."
        consequences={[
          'A sala é encerrada e o convite do paciente deixa de funcionar.',
          'O atendimento sai da fila e passa a constar como finalizado.',
          'Correções posteriores só entram como adendo, preservando o registro original.',
        ]}
        confirmLabel="Salvar e finalizar"
        cancelLabel="Continuar editando"
        tone="warning"
        loading={finish.isPending}
        error={
          finish.isError ? (
            <Alert tone="error" compact>
              {getApiErrorMessage(finish.error)}
            </Alert>
          ) : null
        }
        onConfirm={() => void handleSubmit((values) => finish.mutate(values))()}
        onCancel={() => setConfirmingFinish(false)}
      />
    </section>
  )
}
