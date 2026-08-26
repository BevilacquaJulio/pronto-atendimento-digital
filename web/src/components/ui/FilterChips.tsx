import { XIcon } from '@phosphor-icons/react'

export type ActiveFilter = {
  id: string
  label: string
  value: string
  onRemove: () => void
}

type FilterChipsProps = {
  filters: ActiveFilter[]
  onClearAll: () => void
}

/**
 * Mostra o que está escondendo resultados.
 *
 * Numa fila clínica isso é mais do que conforto: um filtro esquecido faz
 * "nenhum atendimento encontrado" parecer fila vazia, quando pode haver alguém
 * vermelho fora do recorte. O chip torna o recorte visível e reversível em um
 * clique.
 */
export function FilterChips({ filters, onClearAll }: FilterChipsProps) {
  if (filters.length === 0) return null

  return (
    <div className="filter-chips">
      <span className="filter-chips__label">Filtros ativos:</span>
      {filters.map((filter) => (
        <span className="filter-chip" key={filter.id}>
          {filter.label}: {filter.value}
          <button
            type="button"
            aria-label={`Remover filtro ${filter.label}`}
            onClick={filter.onRemove}
          >
            <XIcon size={11} weight="bold" aria-hidden="true" />
          </button>
        </span>
      ))}
      <button
        type="button"
        className="filter-chips__clear"
        onClick={onClearAll}
      >
        Limpar tudo
      </button>
    </div>
  )
}
