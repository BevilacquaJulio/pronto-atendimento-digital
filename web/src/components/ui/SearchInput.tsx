import { MagnifyingGlassIcon, XIcon } from '@phosphor-icons/react'

type SearchInputProps = {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  wide?: boolean
}

export function SearchInput({
  label,
  value,
  onChange,
  placeholder = 'Buscar',
  wide = false,
}: SearchInputProps) {
  return (
    <div
      className="search-control"
      style={wide ? { maxWidth: 'none' } : undefined}
    >
      <MagnifyingGlassIcon size={18} aria-hidden="true" />
      <input
        type="search"
        value={value}
        aria-label={label}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
      {value ? (
        <button
          type="button"
          className="icon-button icon-button--sm"
          aria-label="Limpar busca"
          onClick={() => onChange('')}
        >
          <XIcon size={14} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  )
}
