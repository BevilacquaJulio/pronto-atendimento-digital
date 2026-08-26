import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { registerSW } from 'virtual:pwa-register'
import { PwaUpdatePrompt } from './PwaUpdatePrompt'

vi.mock('virtual:pwa-register', () => ({ registerSW: vi.fn() }))

const mockedRegisterSW = vi.mocked(registerSW)

describe('PwaUpdatePrompt', () => {
  beforeEach(() => {
    mockedRegisterSW.mockReset()
  })

  it('informa quando o shell da aplicação está disponível offline', async () => {
    mockedRegisterSW.mockImplementation((options) => {
      options?.onOfflineReady?.()
      return vi.fn()
    })

    render(<PwaUpdatePrompt />)

    expect(
      await screen.findByText('Aplicativo pronto para uso offline'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Dados assistenciais continuam disponíveis somente online/i),
    ).toBeInTheDocument()
  })

  it('permite aplicar uma nova versão quando solicitada', async () => {
    const user = userEvent.setup()
    const updateServiceWorker = vi.fn().mockResolvedValue(undefined)

    mockedRegisterSW.mockImplementation((options) => {
      options?.onNeedRefresh?.()
      return updateServiceWorker
    })

    render(<PwaUpdatePrompt />)

    await user.click(screen.getByRole('button', { name: 'Atualizar agora' }))

    expect(updateServiceWorker).toHaveBeenCalledWith(true)
  })

  it('permite dispensar o aviso sem atualizar', async () => {
    const user = userEvent.setup()

    mockedRegisterSW.mockImplementation((options) => {
      options?.onNeedRefresh?.()
      return vi.fn()
    })

    render(<PwaUpdatePrompt />)
    await user.click(screen.getByRole('button', { name: 'Fechar aviso' }))

    expect(screen.queryByText('Nova versão disponível')).not.toBeInTheDocument()
  })
})
