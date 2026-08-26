import { WarningCircleIcon, WarningIcon } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { Button, type ButtonVariant } from './Button'
import { Modal } from './Modal'

type ConfirmTone = 'default' | 'danger' | 'warning'

type ConfirmDialogProps = {
  open: boolean
  title: string
  /** O que muda ao confirmar, em uma frase. */
  description: string
  /**
   * Consequências concretas. Prefira frases verificáveis ("o convite atual
   * deixa de funcionar") a avisos genéricos ("esta ação é irreversível"), que
   * o usuário aprende a ignorar.
   */
  consequences?: string[]
  confirmLabel: string
  cancelLabel?: string
  tone?: ConfirmTone
  loading?: boolean
  error?: ReactNode
  eyebrow?: string
  onConfirm: () => void
  onCancel: () => void
}

const confirmVariant: Record<ConfirmTone, ButtonVariant> = {
  default: 'primary',
  danger: 'danger',
  warning: 'primary',
}

export function ConfirmDialog({
  open,
  title,
  description,
  consequences,
  confirmLabel,
  cancelLabel = 'Cancelar',
  tone = 'default',
  loading = false,
  error,
  eyebrow,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      eyebrow={eyebrow}
      description={description}
      tone={tone}
      size="sm"
      // Enquanto a mutação está no ar, fechar por Escape deixaria o usuário
      // sem saber se a ação foi ou não executada.
      dismissible={!loading}
      icon={
        tone === 'danger' ? (
          <WarningIcon size={22} weight="duotone" />
        ) : (
          <WarningCircleIcon size={22} weight="duotone" />
        )
      }
      footer={
        <>
          <Button
            type="button"
            variant="ghost"
            disabled={loading}
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={confirmVariant[tone]}
            loading={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {consequences && consequences.length > 0 ? (
        <div className={`modal__consequence modal__consequence--${tone}`}>
          <div>
            <strong>O que acontece ao confirmar</strong>
            <ul>
              {consequences.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
      {error}
    </Modal>
  )
}
