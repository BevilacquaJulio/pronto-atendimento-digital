import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Select, type SelectOption } from './Select'

type Papel = 'ENFERMEIRO' | 'MEDICO' | 'ADMIN'

const options: Array<SelectOption<Papel>> = [
  { value: 'ENFERMEIRO', label: 'Enfermagem', description: 'Triagem' },
  { value: 'MEDICO', label: 'Medicina', description: 'Prontuário' },
  { value: 'ADMIN', label: 'Administração', description: 'Acessos' },
]

function ControlledSelect({ onChange }: { onChange?: (value: Papel) => void }) {
  const [value, setValue] = useState<Papel>('ENFERMEIRO')

  return (
    <Select
      label="Perfil e permissões"
      value={value}
      options={options}
      onChange={(next) => {
        setValue(next)
        onChange?.(next)
      }}
    />
  )
}

describe('Select', () => {
  it('abre no clique e seleciona a opção escolhida', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ControlledSelect onChange={onChange} />)

    const trigger = screen.getByRole('combobox', { name: 'Perfil e permissões' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')

    await user.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')

    await user.click(screen.getByRole('option', { name: /Medicina/ }))

    expect(onChange).toHaveBeenCalledWith('MEDICO')
    expect(trigger).toHaveTextContent('Medicina')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('navega e confirma pelo teclado, como o select nativo', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ControlledSelect onChange={onChange} />)

    const trigger = screen.getByRole('combobox', { name: 'Perfil e permissões' })
    trigger.focus()

    await user.keyboard('{ArrowDown}')
    expect(trigger).toHaveAttribute('aria-expanded', 'true')

    await user.keyboard('{ArrowDown}{Enter}')

    expect(onChange).toHaveBeenCalledWith('MEDICO')
  })

  it('fecha com Escape sem alterar o valor', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ControlledSelect onChange={onChange} />)

    const trigger = screen.getByRole('combobox', { name: 'Perfil e permissões' })
    await user.click(trigger)
    await user.keyboard('{Escape}')

    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('busca por digitação dentro da lista aberta', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ControlledSelect onChange={onChange} />)

    const trigger = screen.getByRole('combobox', { name: 'Perfil e permissões' })
    trigger.focus()
    await user.keyboard('{ArrowDown}')

    // "adm" precisa levar a Administração — é o comportamento que o select
    // nativo dá de graça e que se perde num dropdown caseiro.
    await user.keyboard('adm{Enter}')

    expect(onChange).toHaveBeenCalledWith('ADMIN')
  })

  it('fecha ao clicar fora', async () => {
    const user = userEvent.setup()
    render(
      <>
        <ControlledSelect />
        <button type="button">Fora</button>
      </>,
    )

    const trigger = screen.getByRole('combobox', { name: 'Perfil e permissões' })
    await user.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')

    await user.click(screen.getByRole('button', { name: 'Fora' }))
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })
})
