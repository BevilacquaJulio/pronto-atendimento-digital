import { useCallback, useRef } from 'react'

const RESET_DELAY_MS = 600

/**
 * Busca por digitação dentro de uma lista aberta: teclar "m", "e", "d" leva a
 * "Medicina". É o comportamento que o `<select>` nativo dá de graça e que se
 * perde ao construir um dropdown próprio — sem isso, quem usa teclado precisa
 * descer opção por opção.
 *
 * O buffer zera após 600ms de pausa, então "me" busca "me" e, depois da pausa,
 * "d" volta a buscar itens começados por "d".
 */
export function useTypeahead(
  labels: string[],
  onMatch: (index: number) => void,
) {
  const bufferRef = useRef('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  return useCallback(
    (character: string) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      bufferRef.current += character.toLowerCase()

      const query = bufferRef.current
      const index = labels.findIndex((label) =>
        label.toLowerCase().startsWith(query),
      )
      if (index >= 0) onMatch(index)

      timerRef.current = setTimeout(() => {
        bufferRef.current = ''
      }, RESET_DELAY_MS)
    },
    [labels, onMatch],
  )
}
