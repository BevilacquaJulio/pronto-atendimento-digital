import { describe, expect, it } from 'vitest'
import type { AttendanceListItem } from './atendimentos.types'
import { canForwardToDoctor, primaryActionLabel } from './queue-helpers'

const item: AttendanceListItem = {
  id: 'atendimento-1',
  status: 'FINALIZADO',
  risco: 'AMARELO',
  entradaFila: '2026-08-14T12:00:00.000Z',
  iniciadoEm: '2026-08-14T12:05:00.000Z',
  paciente: {
    id: 'paciente-1',
    nome: 'Maria da Silva',
    cpf: '12345678901',
    contato: '(11) 99999-9999',
  },
  profissional: { id: 'enfermeiro-1', nome: 'Ana Ferreira' },
  encaminhadoDeId: null,
  encaminhadoPara: null,
}

describe('canForwardToDoctor', () => {
  it('libera a enfermagem a encaminhar um finalizado com triagem e sem ficha médica', () => {
    expect(canForwardToDoctor(item, 'ENFERMEIRO')).toBe(true)
  })

  it('bloqueia médico, encaminhamento já feito e ausência de triagem', () => {
    expect(canForwardToDoctor(item, 'MEDICO')).toBe(false)
    expect(
      canForwardToDoctor({ ...item, encaminhadoPara: { id: 'medico-1' } }, 'ENFERMEIRO'),
    ).toBe(false)
    expect(canForwardToDoctor({ ...item, risco: null }, 'ENFERMEIRO')).toBe(
      false,
    )
  })
})

describe('primaryActionLabel', () => {
  it('mostra encaminhar em vez de ver detalhes quando a ficha médica ainda não existe', () => {
    expect(primaryActionLabel(item, 'ENFERMEIRO')).toBe(
      'Encaminhar para médico',
    )
    expect(primaryActionLabel(item, 'MEDICO')).toBe('Ver detalhes')
  })
})
