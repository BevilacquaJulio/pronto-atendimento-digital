import {
  ShieldCheckIcon,
  VideoCameraIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoConference,
} from '@livekit/components-react'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Logo } from '../../../components/brand/Logo'
import { Alert } from '../../../components/ui/Alert'
import { Button } from '../../../components/ui/Button'
import { getApiErrorMessage } from '../../../lib/api'
import { exchangePatientLink, renewPatientRoomAccess } from '../sala.api'
import type { RoomAccess } from '../sala.types'

/**
 * Sala vista pelo paciente — única tela fora do shell autenticado.
 *
 * O paciente entra por link, sem conta e possivelmente pelo celular, em pé no
 * corredor da empresa. Por isso a tela tem um alvo só: um botão grande. Tudo
 * mais é contexto de confiança (marca, aviso de privacidade), não navegação.
 */
export function PatientRoomPage() {
  const { atendimentoId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const opaqueToken = searchParams.get('token') ?? ''
  const [roomAccess, setRoomAccess] = useState<RoomAccess | null>(null)
  const [disconnectedToken, setDisconnectedToken] = useState<string | null>(
    null,
  )

  const entry = useMutation({
    mutationFn: () =>
      exchangePatientLink({ token: opaqueToken, attendanceId: atendimentoId }),
    onSuccess: (data) => {
      setRoomAccess(data)
      setDisconnectedToken(null)
    },
  })

  const renewal = useMutation({
    mutationFn: () =>
      renewPatientRoomAccess({
        attendanceId: atendimentoId,
        token: roomAccess?.token ?? '',
      }),
    onSuccess: (data) => {
      setRoomAccess(data)
      setDisconnectedToken(null)
    },
  })

  if (roomAccess) {
    const disconnected = disconnectedToken === roomAccess.token

    return (
      <div className="conference-screen">
        {!disconnected ? (
          <LiveKitRoom
            key={roomAccess.token}
            token={roomAccess.token}
            serverUrl={roomAccess.url}
            connect
            audio
            video
            data-lk-theme="default"
            className="conference-room"
            onConnected={() => {
              renewal.reset()
              setDisconnectedToken(null)
            }}
            onDisconnected={() => {
              renewal.reset()
              setDisconnectedToken(roomAccess.token)
            }}
          >
            <VideoConference />
            <RoomAudioRenderer />
          </LiveKitRoom>
        ) : null}

        {disconnected ? (
          <div
            className="conference-disconnected conference-disconnected--patient"
            role="alert"
          >
            <WarningCircleIcon size={32} weight="duotone" aria-hidden="true" />
            <div>
              <strong>Sua conexão com a sala caiu</strong>
              <p>
                Você pode tentar reconectar com segurança, sem utilizar o
                convite novamente.
              </p>
              {renewal.isError ? (
                <small>{getApiErrorMessage(renewal.error)}</small>
              ) : null}
            </div>
            <Button
              type="button"
              variant="secondary"
              loading={renewal.isPending}
              onClick={() => renewal.mutate()}
            >
              Reconectar
            </Button>
          </div>
        ) : null}
      </div>
    )
  }

  const invalidLink = !atendimentoId || !opaqueToken

  return (
    <main className="patient-room-page">
      <div className="brand-rings" aria-hidden="true" />

      <section className="patient-room-card page-enter">
        <Logo variant="full" size={38} label="PAD — Pronto Atendimento Digital" />

        <span className="patient-room-card__icon" aria-hidden="true">
          {invalidLink ? (
            <WarningCircleIcon size={29} weight="duotone" />
          ) : (
            <VideoCameraIcon size={29} weight="duotone" />
          )}
        </span>

        <p>Teleatendimento</p>
        <h1>
          {invalidLink ? 'Link de acesso incompleto' : 'Sua sala está pronta'}
        </h1>
        <span className="patient-room-card__lead">
          {invalidLink
            ? 'Solicite um novo convite ao profissional responsável pelo seu atendimento.'
            : 'Procure um local reservado e com boa conexão antes de entrar.'}
        </span>

        {entry.isError ? (
          <Alert tone="error">{getApiErrorMessage(entry.error)}</Alert>
        ) : null}

        <Button
          type="button"
          size="lg"
          block
          disabled={invalidLink}
          loading={entry.isPending}
          icon={<VideoCameraIcon size={18} weight="fill" />}
          onClick={() => entry.mutate()}
        >
          Entrar no atendimento
        </Button>

        <div className="patient-room-card__security">
          <ShieldCheckIcon size={17} weight="duotone" aria-hidden="true" />
          <span>
            Este convite é individual e pode ser utilizado uma única vez.
          </span>
        </div>
      </section>
    </main>
  )
}
