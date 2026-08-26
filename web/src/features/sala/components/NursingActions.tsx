import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ClipboardTextIcon,
} from '@phosphor-icons/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Alert } from '../../../components/ui/Alert'
import { Button } from '../../../components/ui/Button'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { FormField, TextAreaField } from '../../../components/ui/FormField'
import { Select } from '../../../components/ui/Select'
import { useToast } from '../../../components/ui/toast-context'
import { getApiErrorMessage } from '../../../lib/api'
import { useAuth } from '../../auth/auth-context'
import {
  createTriage,
  finalizeAttendance,
  forwardAttendance,
} from '../../atendimentos/atendimentos.api'
import {
  toTriageInput,
  triageFormSchema,
  type TriageFormValues,
} from '../../atendimentos/atendimentos.schema'
import type { AttendanceDetail } from '../../atendimentos/atendimentos.types'
import { riskOptions } from '../risk-options'

type NursingActionsProps = {
  attendance: AttendanceDetail
  onComplete: () => void
}

type EndAction = 'forward' | 'finish'

const endActionCopy: Record<
  EndAction,
  { title: string; description: string; confirm: string; consequences: string[] }
> = {
  forward: {
    title: 'Encaminhar para a fila médica?',
    description:
      'A etapa de enfermagem é encerrada e uma nova ficha é criada para o médico.',
    confirm: 'Encaminhar paciente',
    consequences: [
      'A sala atual é encerrada e o convite do paciente deixa de funcionar.',
      'A triagem registrada segue visível para o médico que assumir.',
      'O paciente volta a aguardar — agora na fila médica.',
    ],
  },
  finish: {
    title: 'Encerrar sem encaminhamento?',
    description:
      'O atendimento é finalizado e não segue para avaliação médica.',
    confirm: 'Encerrar atendimento',
    consequences: [
      'A sala é encerrada e o convite do paciente deixa de funcionar.',
      'O atendimento sai da fila e passa a constar como finalizado.',
      'Se a triagem já foi registrada, ainda é possível encaminhar para o médico pela fila.',
    ],
  },
}

export function NursingActions({ attendance, onComplete }: NursingActionsProps) {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { notify } = useToast()
  const [confirming, setConfirming] = useState<EndAction | null>(null)

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<TriageFormValues>({
    resolver: zodResolver(triageFormSchema),
    defaultValues: {
      risco: 'VERDE',
      queixa: '',
      pa: '',
      fc: '',
      temperatura: '',
      satO2: '',
    },
  })

  const triage = useMutation({
    mutationFn: (values: TriageFormValues) =>
      createTriage({
        attendanceId: attendance.id,
        input: toTriageInput(values),
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(
        ['attendance', user?.id, attendance.id],
        updated,
      )
      void queryClient.invalidateQueries({ queryKey: ['queue'] })
      notify({ tone: 'success', title: 'Triagem registrada' })
    },
  })

  const endAttendance = useMutation({
    mutationFn: (action: EndAction) =>
      action === 'forward'
        ? forwardAttendance(attendance.id)
        : finalizeAttendance(attendance.id),
    onSuccess: (_data, action) => {
      void queryClient.invalidateQueries({ queryKey: ['queue'] })
      setConfirming(null)
      notify({
        tone: 'success',
        title:
          action === 'forward'
            ? 'Paciente encaminhado'
            : 'Atendimento encerrado',
        description: `${attendance.paciente.nome} — ação registrada com sucesso.`,
      })
      onComplete()
    },
  })

  if (!attendance.triagem) {
    return (
      <section className="clinical-panel" aria-labelledby="triage-title">
        <header className="clinical-panel__heading">
          <span aria-hidden="true">
            <ClipboardTextIcon size={20} weight="duotone" />
          </span>
          <div>
            <h2 id="triage-title">Triagem de enfermagem</h2>
            <p>Registre a queixa e os sinais antes da decisão assistencial.</p>
          </div>
        </header>

        <form
          className="clinical-form"
          onSubmit={handleSubmit((values) => triage.mutate(values))}
        >
          {/*
            `Controller` porque o Select é controlado e não expõe um input
            nativo para o `register` observar. É a ponte oficial do React Hook
            Form para componente customizado.
          */}
          <Controller
            control={control}
            name="risco"
            render={({ field }) => (
              <Select
                label="Classificação de risco"
                value={field.value}
                options={riskOptions}
                onChange={field.onChange}
              />
            )}
          />

          <TextAreaField
            label="Queixa principal"
            rows={4}
            placeholder="Descreva o motivo do atendimento relatado pelo paciente."
            error={errors.queixa?.message}
            {...register('queixa')}
          />

          <div className="vital-signs-grid">
            <FormField
              label="Pressão arterial"
              placeholder="120/80"
              inputMode="numeric"
              error={errors.pa?.message}
              {...register('pa')}
            />
            <FormField
              label="Frequência cardíaca"
              type="number"
              placeholder="80"
              hint="bpm"
              error={errors.fc?.message}
              {...register('fc')}
            />
            <FormField
              label="Temperatura"
              type="number"
              step="0.1"
              placeholder="36.5"
              hint="°C"
              error={errors.temperatura?.message}
              {...register('temperatura')}
            />
            <FormField
              label="Saturação O₂"
              type="number"
              placeholder="98"
              hint="%"
              error={errors.satO2?.message}
              {...register('satO2')}
            />
          </div>

          {triage.isError ? (
            <Alert tone="error" compact>
              {getApiErrorMessage(triage.error)}
            </Alert>
          ) : null}

          <Button
            type="submit"
            loading={triage.isPending}
            icon={<CheckCircleIcon size={17} />}
          >
            Salvar triagem
          </Button>
        </form>
      </section>
    )
  }

  return (
    <section className="clinical-panel" aria-labelledby="nursing-decision-title">
      <header className="clinical-panel__heading">
        <span aria-hidden="true">
          <CheckCircleIcon size={20} weight="duotone" />
        </span>
        <div>
          <h2 id="nursing-decision-title">Triagem registrada</h2>
          <p>{attendance.triagem.queixa}</p>
        </div>
      </header>

      <div className="clinical-actions">
        <Button
          type="button"
          icon={<ArrowRightIcon size={17} />}
          onClick={() => setConfirming('forward')}
        >
          Encaminhar para médico
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setConfirming('finish')}
        >
          Encerrar atendimento
        </Button>
      </div>

      {endAttendance.isError ? (
        <Alert tone="error" compact>
          {getApiErrorMessage(endAttendance.error)}
        </Alert>
      ) : null}

      <ConfirmDialog
        open={confirming !== null}
        eyebrow="Decisão assistencial"
        title={confirming ? endActionCopy[confirming].title : ''}
        description={confirming ? endActionCopy[confirming].description : ''}
        consequences={confirming ? endActionCopy[confirming].consequences : []}
        confirmLabel={confirming ? endActionCopy[confirming].confirm : ''}
        cancelLabel="Voltar"
        tone="warning"
        loading={endAttendance.isPending}
        onConfirm={() => confirming && endAttendance.mutate(confirming)}
        onCancel={() => setConfirming(null)}
      />
    </section>
  )
}
