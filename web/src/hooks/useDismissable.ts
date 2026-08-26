import { useEffect, type RefObject } from 'react'

type DismissableOptions = {
  /** Só escuta enquanto o elemento está aberto — evita listeners órfãos. */
  enabled: boolean
  containerRef: RefObject<HTMLElement | null>
  onDismiss: () => void
}

/**
 * Fecha um elemento flutuante ao clicar fora, pressionar Escape ou mover o
 * foco para longe dele.
 *
 * O listener de ponteiro usa `pointerdown` em vez de `click` porque o clique
 * só dispara depois do `mouseup`: com `click`, arrastar uma seleção de dentro
 * do menu para fora fecharia o menu sem querer.
 *
 * `focusin` cobre a navegação por Tab, que não gera evento de ponteiro nenhum
 * — sem ele o menu ficaria aberto atrás do foco.
 */
export function useDismissable({
  enabled,
  containerRef,
  onDismiss,
}: DismissableOptions) {
  useEffect(() => {
    if (!enabled) return

    function isOutside(target: EventTarget | null) {
      const container = containerRef.current
      return (
        container !== null &&
        target instanceof Node &&
        !container.contains(target)
      )
    }

    function handlePointerDown(event: PointerEvent) {
      if (isOutside(event.target)) onDismiss()
    }

    function handleFocusIn(event: FocusEvent) {
      if (isOutside(event.target)) onDismiss()
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onDismiss()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('focusin', handleFocusIn)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('focusin', handleFocusIn)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled, containerRef, onDismiss])
}
