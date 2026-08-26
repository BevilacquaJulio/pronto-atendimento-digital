import { CaretDownIcon, CheckIcon } from '@phosphor-icons/react'
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { useDisclosure } from '../../hooks/useDisclosure'
import { useDismissable } from '../../hooks/useDismissable'
import { useTypeahead } from '../../hooks/useTypeahead'

export type SelectOption<TValue extends string> = {
  value: TValue
  label: string
  /** Linha secundária — use para explicar o efeito da opção, não para enfeitar. */
  description?: string
  icon?: ReactNode
  disabled?: boolean
}

type SelectProps<TValue extends string> = {
  label: string
  value: TValue
  options: Array<SelectOption<TValue>>
  onChange: (value: TValue) => void
  /** Esconde o rótulo visualmente, mantendo-o para leitores de tela. */
  hideLabel?: boolean
  placeholder?: string
  disabled?: boolean
  size?: 'sm' | 'md'
  variant?: 'solid' | 'ghost'
  icon?: ReactNode
  align?: 'start' | 'end'
  name?: string
}

/**
 * Combobox somente-seleção seguindo o padrão ARIA 1.2: o foco permanece no
 * gatilho e a opção ativa é anunciada por `aria-activedescendant`. Gerenciar
 * foco assim (em vez de mover o foco para dentro da lista) evita o pulo de
 * scroll que o leitor de tela provoca ao entrar e sair do popup.
 */
export function Select<TValue extends string>({
  label,
  value,
  options,
  onChange,
  hideLabel = false,
  placeholder = 'Selecione',
  disabled = false,
  size = 'md',
  variant = 'solid',
  icon,
  align = 'start',
  name,
}: SelectProps<TValue>) {
  const { isOpen, close, open: openDisclosure } = useDisclosure()
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const baseId = useId()
  const labelId = `${baseId}-label`
  const listboxId = `${baseId}-listbox`

  const selectedIndex = options.findIndex((option) => option.value === value)
  const [activeIndex, setActiveIndex] = useState(Math.max(selectedIndex, 0))
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined

  useDismissable({ enabled: isOpen, containerRef, onDismiss: close })

  // Abrir é um evento, não uma sincronização: posicionar a opção ativa aqui —
  // e não num efeito que observa `isOpen` — evita o render em cascata que o
  // React 19 sinaliza, e deixa claro que a posição inicial é consequência da
  // ação do usuário.
  const openList = useCallback(() => {
    setActiveIndex(Math.max(selectedIndex, 0))
    openDisclosure()
  }, [selectedIndex, openDisclosure])

  function toggleList() {
    if (isOpen) close()
    else openList()
  }

  // Mantém a opção ativa visível quando a lista rola. `scrollIntoView` sobre
  // uma ref é leitura de layout, não manipulação de DOM — o React continua
  // dono da árvore.
  useEffect(() => {
    if (!isOpen) return
    const activeNode = listRef.current?.children[activeIndex]
    if (activeNode instanceof HTMLElement) {
      activeNode.scrollIntoView({ block: 'nearest' })
    }
  }, [isOpen, activeIndex])

  const moveTo = useCallback(
    (index: number) => {
      const total = options.length
      if (total === 0) return
      const wrapped = (index + total) % total
      setActiveIndex(wrapped)
    },
    [options.length],
  )

  const handleTypeahead = useTypeahead(
    options.map((option) => option.label),
    moveTo,
  )

  function selectOption(index: number) {
    const option = options[index]
    if (!option || option.disabled) return
    onChange(option.value)
    close()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return

    if (!isOpen) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
        event.preventDefault()
        openList()
      }
      return
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        moveTo(activeIndex + 1)
        break
      case 'ArrowUp':
        event.preventDefault()
        moveTo(activeIndex - 1)
        break
      case 'Home':
        event.preventDefault()
        moveTo(0)
        break
      case 'End':
        event.preventDefault()
        moveTo(options.length - 1)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        selectOption(activeIndex)
        break
      case 'Tab':
        // Tab confirma a opção ativa e sai, como no select nativo.
        selectOption(activeIndex)
        break
      default:
        if (event.key.length === 1 && !event.metaKey && !event.ctrlKey) {
          handleTypeahead(event.key)
        }
    }
  }

  const classes = [
    'select',
    size === 'sm' ? 'select--sm' : '',
    variant === 'ghost' ? 'select--ghost' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes} ref={containerRef}>
      <span className={hideLabel ? 'sr-only' : 'field-label'} id={labelId}>
        {label}
      </span>
      {name ? <input type="hidden" name={name} value={value} /> : null}

      <button
        type="button"
        className="select__trigger"
        role="combobox"
        aria-labelledby={labelId}
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-activedescendant={
          isOpen ? `${baseId}-option-${activeIndex}` : undefined
        }
        disabled={disabled}
        onClick={toggleList}
        onKeyDown={handleKeyDown}
      >
        {icon ? (
          <span className="select__trigger-icon" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <span
          className={`select__value ${selected ? '' : 'select__value--placeholder'}`}
        >
          {selected?.label ?? placeholder}
        </span>
        <CaretDownIcon className="select__caret" size={15} aria-hidden="true" />
      </button>

      {isOpen ? (
        <ul
          className={`menu-panel menu-panel--below ${align === 'end' ? 'menu-panel--end' : ''}`}
          id={listboxId}
          role="listbox"
          aria-labelledby={labelId}
          ref={listRef}
        >
          {options.map((option, index) => (
            <li
              className={`menu-item ${index === activeIndex ? 'is-active' : ''}`}
              id={`${baseId}-option-${index}`}
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              aria-disabled={option.disabled || undefined}
              onPointerMove={() => setActiveIndex(index)}
              onClick={() => selectOption(index)}
            >
              {option.icon ? (
                <span className="menu-item__icon" aria-hidden="true">
                  {option.icon}
                </span>
              ) : null}
              <span className="menu-item__text">
                <strong>{option.label}</strong>
                {option.description ? <small>{option.description}</small> : null}
              </span>
              <span className="menu-item__check" aria-hidden="true">
                <CheckIcon size={15} weight="bold" />
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
