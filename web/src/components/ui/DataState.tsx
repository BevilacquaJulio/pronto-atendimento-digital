import {
  ArrowClockwiseIcon,
  ClipboardTextIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { Button } from './Button'

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="skeleton-list" aria-label="Carregando dados" role="status">
      {Array.from({ length: rows }, (_, index) => (
        <div className="skeleton-row" key={`skeleton-${index}`}>
          <span className="skeleton-line skeleton-line--wide" />
          <span className="skeleton-line" />
          <span className="skeleton-line skeleton-line--short" />
        </div>
      ))}
    </div>
  )
}

type EmptyStateProps = {
  title: string
  description: string
  /** Ação que resolve o vazio — normalmente "limpar filtros" ou "cadastrar". */
  action?: ReactNode
  icon?: ReactNode
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: EmptyStateProps) {
  return (
    <div className="data-state">
      <span className="data-state__icon" aria-hidden="true">
        {icon ?? <ClipboardTextIcon size={26} weight="duotone" />}
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  )
}

type ErrorStateProps = {
  message: string
  onRetry?: () => void
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="data-state data-state--error" role="alert">
      <span className="data-state__icon" aria-hidden="true">
        <WarningCircleIcon size={26} weight="duotone" />
      </span>
      <h2>Não foi possível carregar</h2>
      <p>{message}</p>
      {onRetry ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          icon={<ArrowClockwiseIcon size={16} />}
          onClick={onRetry}
        >
          Tentar novamente
        </Button>
      ) : null}
    </div>
  )
}
