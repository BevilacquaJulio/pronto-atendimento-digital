import {
  ArrowClockwiseIcon,
  CheckCircleIcon,
  XIcon,
} from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'
import { Button } from '../ui/Button'

type PwaNotice = 'offline-ready' | 'update-available' | null

export function PwaUpdatePrompt() {
  const [notice, setNotice] = useState<PwaNotice>(null)
  const updateServiceWorker = useRef<ReturnType<typeof registerSW>>(
    async () => undefined,
  )

  useEffect(() => {
    updateServiceWorker.current = registerSW({
      immediate: true,
      onOfflineReady: () => setNotice('offline-ready'),
      onNeedRefresh: () => setNotice('update-available'),
    })
  }, [])

  if (!notice) return null

  const updateAvailable = notice === 'update-available'

  return (
    <aside className="pwa-prompt" role="status" aria-live="polite">
      <span className="pwa-prompt__icon" aria-hidden="true">
        {updateAvailable ? (
          <ArrowClockwiseIcon size={22} weight="duotone" />
        ) : (
          <CheckCircleIcon size={22} weight="duotone" />
        )}
      </span>

      <div className="pwa-prompt__content">
        <strong>
          {updateAvailable
            ? 'Nova versão disponível'
            : 'Aplicativo pronto para uso offline'}
        </strong>
        <p>
          {updateAvailable
            ? 'Atualize para receber as melhorias mais recentes do PAD.'
            : 'A interface abre sem conexão. Dados assistenciais continuam disponíveis somente online.'}
        </p>
        {updateAvailable ? (
          <div className="pwa-prompt__actions">
            <Button
              type="button"
              size="sm"
              icon={<ArrowClockwiseIcon size={15} />}
              onClick={() => void updateServiceWorker.current(true)}
            >
              Atualizar agora
            </Button>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        className="icon-button icon-button--sm"
        aria-label="Fechar aviso"
        onClick={() => setNotice(null)}
      >
        <XIcon size={15} aria-hidden="true" />
      </button>
    </aside>
  )
}
