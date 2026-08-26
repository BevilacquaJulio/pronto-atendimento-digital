import { createContext, useContext } from 'react'

export type ToastTone = 'success' | 'error' | 'info'

export type ToastInput = {
  title: string
  description?: string
  tone?: ToastTone
  /** Milissegundos até sumir. `0` mantém até o usuário fechar. */
  duration?: number
}

export type Toast = ToastInput & { id: string }

type ToastContextValue = {
  notify: (toast: ToastInput) => void
  dismiss: (id: string) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

/**
 * Contexto e hook ficam num arquivo só de valores, sem componente, para o
 * Fast Refresh do Vite não invalidar a árvore inteira a cada edição do
 * Provider (regra `react-refresh/only-export-components`).
 */
export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast precisa estar dentro de <ToastProvider>')
  }
  return context
}
