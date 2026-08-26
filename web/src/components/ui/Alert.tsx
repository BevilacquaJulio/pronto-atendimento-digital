import {
  CheckCircleIcon,
  InfoIcon,
  WarningCircleIcon,
  WarningIcon,
} from '@phosphor-icons/react'
import type { ReactNode } from 'react'

type AlertTone = 'error' | 'warning' | 'success' | 'info'

type AlertProps = {
  tone?: AlertTone
  title?: string
  children: ReactNode
  compact?: boolean
}

const toneIcon: Record<AlertTone, ReactNode> = {
  error: <WarningCircleIcon size={19} weight="duotone" />,
  warning: <WarningIcon size={19} weight="duotone" />,
  success: <CheckCircleIcon size={19} weight="duotone" />,
  info: <InfoIcon size={19} weight="duotone" />,
}

/**
 * Mensagem presa ao contexto que a gerou. Erro de mutação vem para cá, não
 * para o toast: o usuário precisa poder reler a mensagem enquanto corrige o
 * formulário.
 */
export function Alert({
  tone = 'info',
  title,
  children,
  compact = false,
}: AlertProps) {
  return (
    <div
      className={`alert alert--${tone} ${compact ? 'alert--compact' : ''}`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <span aria-hidden="true">{toneIcon[tone]}</span>
      <div className="alert__body">
        {title ? <strong>{title}</strong> : null}
        <span>{children}</span>
      </div>
    </div>
  )
}
