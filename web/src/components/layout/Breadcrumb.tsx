import { Fragment } from 'react'
import { CaretRightIcon } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'

export type Crumb = {
  label: string
  to?: string
}

/**
 * Trilha de navegação. Só aparece quando há mais de um nível — uma trilha de
 * um item só ocupa espaço sem informar nada.
 */
export function Breadcrumb({ items }: { items: Crumb[] }) {
  if (items.length < 2) return null

  return (
    <nav className="breadcrumb" aria-label="Trilha de navegação">
      {items.map((item, index) => {
        const isLast = index === items.length - 1

        return (
          <Fragment key={`${item.label}-${item.to ?? 'atual'}`}>
            {index > 0 ? (
              <CaretRightIcon
                className="breadcrumb__separator"
                size={11}
                weight="bold"
                aria-hidden="true"
              />
            ) : null}
            {item.to && !isLast ? (
              <Link to={item.to}>{item.label}</Link>
            ) : (
              <span className="breadcrumb__current" aria-current="page">
                {item.label}
              </span>
            )}
          </Fragment>
        )
      })}
    </nav>
  )
}
