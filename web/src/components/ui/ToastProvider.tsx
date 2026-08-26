import {
  CheckCircleIcon,
  InfoIcon,
  WarningCircleIcon,
  XIcon,
} from '@phosphor-icons/react'
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import {
  ToastContext,
  type Toast,
  type ToastInput,
  type ToastTone,
} from './toast-context'

const DEFAULT_DURATION_MS = 5000

const toneIcon: Record<ToastTone, ReactNode> = {
  success: <CheckCircleIcon size={20} weight="duotone" />,
  error: <WarningCircleIcon size={20} weight="duotone" />,
  info: <InfoIcon size={20} weight="duotone" />,
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const notify = useCallback(
    (input: ToastInput) => {
      const id = crypto.randomUUID()
      setToasts((current) => [...current, { ...input, id }])

      const duration = input.duration ?? DEFAULT_DURATION_MS
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration)
      }
    },
    [dismiss],
  )

  const value = useMemo(() => ({ notify, dismiss }), [notify, dismiss])

  return (
    <ToastContext value={value}>
      {children}
      {/*
        `role="status"` + `aria-live="polite"` avisa o leitor de tela sem
        interromper o que ele está lendo. Erro crítico continua indo para um
        alerta inline no formulário — toast some sozinho e não serve como
        único canal de uma mensagem que o usuário precisa ler.
      */}
      <div
        className="toast-viewport"
        role="status"
        aria-live="polite"
        aria-relevant="additions"
      >
        {toasts.map((toast) => (
          <article
            className={`toast toast--${toast.tone ?? 'info'}`}
            key={toast.id}
          >
            <span className="toast__icon" aria-hidden="true">
              {toneIcon[toast.tone ?? 'info']}
            </span>
            <div className="toast__content">
              <strong>{toast.title}</strong>
              {toast.description ? <p>{toast.description}</p> : null}
            </div>
            <button
              type="button"
              className="icon-button icon-button--sm"
              aria-label="Fechar aviso"
              onClick={() => dismiss(toast.id)}
            >
              <XIcon size={15} aria-hidden="true" />
            </button>
          </article>
        ))}
      </div>
    </ToastContext>
  )
}
