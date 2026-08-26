import { useCallback, useState } from 'react'

/**
 * Estado aberto/fechado com ações estáveis.
 *
 * As funções são memorizadas porque elas descem como dependência de efeitos
 * (`useDismissable`, por exemplo). Se fossem recriadas a cada render, o efeito
 * remontaria os listeners em todo ciclo.
 */
export function useDisclosure(initial = false) {
  const [isOpen, setIsOpen] = useState(initial)

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((current) => !current), [])

  return { isOpen, open, close, toggle }
}
