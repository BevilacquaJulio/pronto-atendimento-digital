import {
  CheckIcon,
  ClockCountdownIcon,
  CopyIcon,
  LinkSimpleIcon,
  ShareNetworkIcon,
} from '@phosphor-icons/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Alert } from '../../../components/ui/Alert'
import { Button } from '../../../components/ui/Button'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { useToast } from '../../../components/ui/toast-context'
import { getApiErrorMessage } from '../../../lib/api'
import { formatDateTime } from '../../../lib/format'
import { buildPublicAppUrl } from '../../../lib/public-url'
import { createPatientInvite } from '../sala.api'
import type { PatientInvite } from '../sala.types'

export function PatientInviteCard({ attendanceId }: { attendanceId: string }) {
  const queryClient = useQueryClient()
  const { notify } = useToast()
  const [copied, setCopied] = useState(false)
  const [confirmingRegenerate, setConfirmingRegenerate] = useState(false)
  const [currentInvite, setCurrentInvite] = useState(() =>
    queryClient.getQueryData<PatientInvite>(['patient-invite', attendanceId]),
  )

  const invite = useMutation({
    mutationFn: () => createPatientInvite(attendanceId),
    onSuccess: (createdInvite) => {
      queryClient.setQueryData(['patient-invite', attendanceId], createdInvite)
      setCurrentInvite(createdInvite)
      setCopied(false)
      setConfirmingRegenerate(false)
      notify({ tone: 'success', title: 'Convite gerado' })
    },
  })

  const publicLink = currentInvite ? buildPublicAppUrl(currentInvite.link) : null

  async function copyLink() {
    if (!publicLink) return
    try {
      await navigator.clipboard.writeText(publicLink)
      setCopied(true)
      notify({ tone: 'success', title: 'Link copiado' })
    } catch {
      // Clipboard exige contexto seguro (HTTPS ou localhost). Em HTTP na rede
      // interna a API simplesmente não existe — por isso o input fica visível
      // e selecionável, garantindo o caminho manual.
      notify({
        tone: 'error',
        title: 'Não foi possível copiar',
        description: 'Selecione o link no campo acima e copie manualmente.',
      })
    }
  }

  async function shareLink() {
    if (!publicLink || typeof navigator.share !== 'function') return
    try {
      await navigator.share({
        title: 'Convite para teleatendimento',
        text: 'Acesse sua sala segura de teleatendimento.',
        url: publicLink,
      })
    } catch {
      // Fechar o seletor nativo não é falha do fluxo.
    }
  }

  return (
    <section className="invite-card" aria-labelledby="patient-invite-title">
      <header className="invite-card__heading">
        <span aria-hidden="true">
          <LinkSimpleIcon size={19} weight="duotone" />
        </span>
        <div>
          <h2 id="patient-invite-title">Convite do paciente</h2>
          <p>Link individual, temporário e válido para um único acesso.</p>
        </div>
      </header>

      {currentInvite && publicLink ? (
        <>
          <label className="invite-link">
            <span>Link para compartilhar</span>
            <input value={publicLink} readOnly aria-label="Link do paciente" />
          </label>

          <p className="invite-expiration">
            <ClockCountdownIcon size={14} aria-hidden="true" />
            Expira em {formatDateTime(currentInvite.expiraEm)}
          </p>

          <div className="invite-card__actions">
            <Button
              type="button"
              size="sm"
              icon={copied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
              onClick={() => void copyLink()}
            >
              {copied ? 'Link copiado' : 'Copiar link'}
            </Button>
            {typeof navigator.share === 'function' ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={<ShareNetworkIcon size={16} />}
                onClick={() => void shareLink()}
              >
                Compartilhar
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setConfirmingRegenerate(true)}
            >
              Gerar novo
            </Button>
          </div>
        </>
      ) : (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          loading={invite.isPending}
          icon={<LinkSimpleIcon size={16} />}
          onClick={() => invite.mutate()}
        >
          Gerar convite do paciente
        </Button>
      )}

      {invite.isError ? (
        <Alert tone="error" compact>
          {getApiErrorMessage(invite.error)}
        </Alert>
      ) : null}

      {/*
        Gerar um novo convite invalida o anterior. Sem confirmação, um clique
        distraído derruba o link que o paciente já recebeu por mensagem — e ele
        chega na sala com um link morto, sem entender o motivo.
      */}
      <ConfirmDialog
        open={confirmingRegenerate}
        eyebrow="Acesso do paciente"
        title="Gerar um novo convite?"
        description="O link atual é substituído imediatamente."
        consequences={[
          'O link já enviado ao paciente deixa de funcionar.',
          'Será necessário enviar o novo link antes de o paciente entrar.',
        ]}
        confirmLabel="Gerar novo convite"
        cancelLabel="Manter o atual"
        tone="warning"
        loading={invite.isPending}
        onConfirm={() => invite.mutate()}
        onCancel={() => setConfirmingRegenerate(false)}
      />
    </section>
  )
}
