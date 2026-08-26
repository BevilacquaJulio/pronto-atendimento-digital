import {
  useRef,
  type ReactNode,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { useDisclosure } from '../../hooks/useDisclosure'
import { useDismissable } from '../../hooks/useDismissable'

type DropdownMenuProps = {
  /** Rótulo acessível do gatilho quando ele é só um ícone/avatar. */
  triggerLabel: string
  trigger: ReactNode
  children: ReactNode
  align?: 'start' | 'end'
  className?: string
  wide?: boolean
}

/**
 * Menu de ações (não de seleção). Diferente do `Select`, aqui cada item
 * dispara um comando, então os filhos são `<button role="menuitem">` e o foco
 * de fato entra no painel.
 *
 * O clique em qualquer item fecha o menu via captura no container: assim cada
 * item não precisa lembrar de chamar `close()` — esquecer isso é o bug clássico
 * de menu que fica aberto depois da ação.
 */
export function DropdownMenu({
  triggerLabel,
  trigger,
  children,
  align = 'end',
  className = '',
  wide = false,
}: DropdownMenuProps) {
  const { isOpen, close, toggle } = useDisclosure()
  const containerRef = useRef<HTMLDivElement>(null)

  useDismissable({ enabled: isOpen, containerRef, onDismiss: close })

  function handlePanelKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()

    const items = Array.from(
      containerRef.current?.querySelectorAll<HTMLElement>(
        '[role="menuitem"]:not(:disabled)',
      ) ?? [],
    )
    if (items.length === 0) return

    const current = items.findIndex((item) => item === document.activeElement)
    const step = event.key === 'ArrowDown' ? 1 : -1
    const next = (current + step + items.length) % items.length
    items[next].focus()
  }

  return (
    <div
      className={`dropdown ${className}`}
      ref={containerRef}
      onKeyDown={handlePanelKeyDown}
    >
      <button
        type="button"
        className="dropdown__trigger"
        aria-label={triggerLabel}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={toggle}
      >
        {trigger}
      </button>

      {isOpen ? (
        <div
          className={[
            'menu-panel',
            'menu-panel--below',
            align === 'end' ? 'menu-panel--end' : '',
            wide ? 'menu-panel--wide' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          role="menu"
          aria-label={triggerLabel}
          onClick={close}
        >
          {children}
        </div>
      ) : null}
    </div>
  )
}

type DropdownItemProps = {
  children: ReactNode
  onSelect: () => void
  icon?: ReactNode
  description?: string
  tone?: 'default' | 'danger'
  disabled?: boolean
}

export function DropdownItem({
  children,
  onSelect,
  icon,
  description,
  tone = 'default',
  disabled = false,
}: DropdownItemProps) {
  return (
    <button
      type="button"
      className={`menu-item ${tone === 'danger' ? 'menu-item--danger' : ''}`}
      role="menuitem"
      disabled={disabled}
      onClick={onSelect}
    >
      {icon ? (
        <span className="menu-item__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className="menu-item__text">
        <strong>{children}</strong>
        {description ? <small>{description}</small> : null}
      </span>
    </button>
  )
}

export function DropdownSeparator() {
  return <div className="menu-panel__separator" role="separator" />
}

export function DropdownLabel({ children }: { children: ReactNode }) {
  return <p className="menu-panel__label">{children}</p>
}
