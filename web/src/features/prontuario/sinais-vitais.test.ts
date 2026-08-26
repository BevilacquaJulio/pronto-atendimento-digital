import { describe, expect, it } from 'vitest'
import type { Triage } from '../atendimentos/atendimentos.types'
import { readVitals } from './sinais-vitais'

function triage(overrides: Partial<Triage> = {}): Triage {
  return {
    queixa: 'Cefaleia',
    pa: '120/80',
    fc: 82,
    temperatura: 37.2,
    satO2: 98,
    criadoEm: '2026-08-14T12:10:00.000Z',
    ...overrides,
  }
}

describe('readVitals', () => {
  it('formata temperatura que chega como string, o formato real do Decimal no JSON', () => {
    const vitals = readVitals(triage({ temperatura: '37.2' }))
    const temperature = vitals.find((vital) => vital.key === 'temperatura')

    expect(temperature?.value).toBe('37.2')
    expect(temperature?.unit).toBe('°C')
    expect(temperature?.status).toBe('normal')
  })

  it('não quebra quando a temperatura está ausente', () => {
    const vitals = readVitals(triage({ temperatura: null }))
    const temperature = vitals.find((vital) => vital.key === 'temperatura')

    expect(temperature?.value).toBe('Não informada')
    expect(temperature?.status).toBe('empty')
  })
})
