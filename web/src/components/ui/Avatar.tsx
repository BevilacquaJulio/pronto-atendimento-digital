import { initials } from '../../lib/format'

type AvatarProps = {
  name: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

/**
 * Iniciais a partir do nome. Existe como componente — e não como
 * `nome.slice(0, 1)` espalhado pelas telas — para "AF" significar a mesma
 * pessoa na fila, no prontuário e no menu de perfil.
 */
export function Avatar({ name, size = 'md' }: AvatarProps) {
  return (
    <span
      className={`avatar ${size === 'md' ? '' : `avatar--${size}`}`}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  )
}
