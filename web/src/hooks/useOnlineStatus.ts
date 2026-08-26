import { useSyncExternalStore } from 'react'

function subscribe(onChange: () => void) {
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => {
    window.removeEventListener('online', onChange)
    window.removeEventListener('offline', onChange)
  }
}

/**
 * Estado da conexão via `useSyncExternalStore` — a API que o React 18+ oferece
 * exatamente para ler fonte externa. Com `useState` + `useEffect` haveria uma
 * janela de render com valor desatualizado; aqui não há.
 *
 * Importa em teleatendimento: quando a chamada cai, o profissional precisa
 * distinguir "a internet caiu" de "o sistema falhou" antes de repetir uma
 * ação clínica.
 */
export function useOnlineStatus() {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  )
}
