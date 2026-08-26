import { XIcon } from '@phosphor-icons/react'
import { useEffect, useId, useRef, type ReactNode } from 'react'

type ModalProps = {
  open: boolean
  onClose: () => void
  title: string
  /** Linha de contexto acima do título (ex.: "Controle de acesso"). */
  eyebrow?: string
  description?: string
  icon?: ReactNode
  tone?: 'default' | 'danger' | 'warning'
  size?: 'sm' | 'md' | 'lg'
  children?: ReactNode
  footer?: ReactNode
  /** Impede fechar por Escape/backdrop — use só enquanto algo está sendo salvo. */
  dismissible?: boolean
}

/**
 * Diálogo modal sobre o `<dialog>` nativo.
 *
 * Vale a pena usar o elemento nativo em vez de recriar tudo: ele entrega
 * armadilha de foco, camada superior (top layer, imune a `overflow: hidden` de
 * ancestrais), `::backdrop` e inertização do resto da página — quatro coisas
 * que costumam sair erradas em modal caseiro.
 *
 * O que ainda é nosso: devolver o foco ao gatilho, fechar clicando no fundo e
 * traduzir o evento `cancel` (Escape) em `onClose`, para o estado do React
 * continuar sendo a fonte da verdade.
 */
export function Modal({
  open,
  onClose,
  title,
  eyebrow,
  description,
  icon,
  tone = 'default',
  size = 'md',
  children,
  footer,
  dismissible = true,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open && !dialog.open) {
      // Guarda quem abriu para devolver o foco no fechamento. Sem isso, quem
      // navega por teclado volta para o início da página a cada confirmação.
      openerRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null
      dialog.showModal()
    }

    if (!open && dialog.open) {
      dialog.close()
      openerRef.current?.focus()
    }
  }, [open])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    function handleCancel(event: Event) {
      event.preventDefault()
      if (dismissible) onClose()
    }

    dialog.addEventListener('cancel', handleCancel)
    return () => dialog.removeEventListener('cancel', handleCancel)
  }, [onClose, dismissible])

  // Clique no `<dialog>` fora do painel = clique no backdrop, já que o painel
  // interno ocupa toda a área visível da caixa.
  function handleBackdropClick(event: React.MouseEvent<HTMLDialogElement>) {
    if (dismissible && event.target === dialogRef.current) onClose()
  }

  return (
    <dialog
      className={`modal modal--${size}`}
      ref={dialogRef}
      aria-labelledby={titleId}
      onClick={handleBackdropClick}
    >
      <div className="modal__surface">
        <header className="modal__header">
          {icon ? (
            <span
              className={`modal__icon modal__icon--${tone}`}
              aria-hidden="true"
            >
              {icon}
            </span>
          ) : null}
          <div className="modal__heading">
            {eyebrow ? <p className="modal__eyebrow">{eyebrow}</p> : null}
            <h2 id={titleId}>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          {dismissible ? (
            <button
              type="button"
              className="icon-button"
              aria-label="Fechar"
              onClick={onClose}
            >
              <XIcon size={18} aria-hidden="true" />
            </button>
          ) : null}
        </header>

        {children ? <div className="modal__body">{children}</div> : null}
        {footer ? <footer className="modal__footer">{footer}</footer> : null}
      </div>
    </dialog>
  )
}
