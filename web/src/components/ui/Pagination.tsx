import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react'
import { Button } from './Button'

type PaginationProps = {
  page: number
  totalPages: number
  totalItems: number
  itemLabel: string
  onChange: (page: number) => void
}

export function Pagination({
  page,
  totalPages,
  totalItems,
  itemLabel,
  onChange,
}: PaginationProps) {
  const pages = Math.max(totalPages, 1)

  return (
    <footer className="pagination">
      <p className="pagination__status">
        Página <strong className="tabular">{page}</strong> de{' '}
        <strong className="tabular">{pages}</strong> ·{' '}
        <strong className="tabular">{totalItems}</strong> {itemLabel}
      </p>
      <div className="pagination__controls">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          icon={<CaretLeftIcon size={15} weight="bold" />}
          onClick={() => onChange(page - 1)}
        >
          Anterior
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={page >= pages}
          trailingIcon={<CaretRightIcon size={15} weight="bold" />}
          onClick={() => onChange(page + 1)}
        >
          Próxima
        </Button>
      </div>
    </footer>
  )
}
