import { describe, expect, it } from 'vitest'
import { buildCareEvents } from '../attendance-status'
import type { PatientAttendance } from '../pacientes.types'

const baseAttendance: PatientAttendance = {
  id: 'atendimento-1',
  status: 'AGUARDANDO',
  risco: null,
  entradaFila: '2026-08-14T12:00:00.000Z',
  iniciadoEm: null,
  finalizadoEm: null,
  canceladoEm: null,
  profissional: null,
  triagem: null,
}

describe('buildCareEvents', () => {
  it('mostra só o cadastro enquanto o paciente aguarda na fila', () => {
    const events = buildCareEvents(baseAttendance)
    expect(events.map((event) => event.title)).toEqual(['Paciente cadastrado'])
  })

  it('mantém o cadastro e acrescenta a triagem quando o atendimento começa', () => {
    const events = buildCareEvents({
      ...baseAttendance,
      status: 'EM_ANDAMENTO',
      iniciadoEm: '2026-08-14T12:05:00.000Z',
      profissional: { id: 'enfermeiro-1', nome: 'Ana Ferreira' },
    })
    expect(events.map((event) => event.title)).toEqual([
      'Paciente cadastrado',
      'Triagem pendente',
    ])
  })

  it('não apaga o cadastro depois que a triagem é registrada', () => {
    const events = buildCareEvents({
      ...baseAttendance,
      status: 'EM_ANDAMENTO',
      triagem: {
        queixa: 'Dor de cabeça',
        pa: null,
        fc: null,
        temperatura: null,
        satO2: null,
        criadoEm: '2026-08-14T12:10:00.000Z',
      },
    })
    expect(events.map((event) => event.title)).toEqual([
      'Paciente cadastrado',
      'Triagem de enfermagem',
    ])
  })

  it('encerra a linha com o desfecho depois do cadastro e da triagem', () => {
    const events = buildCareEvents({
      ...baseAttendance,
      status: 'FINALIZADO',
      finalizadoEm: '2026-08-14T12:30:00.000Z',
      triagem: {
        queixa: 'Dor de cabeça',
        pa: null,
        fc: null,
        temperatura: null,
        satO2: null,
        criadoEm: '2026-08-14T12:10:00.000Z',
      },
    })
    expect(events.map((event) => event.title)).toEqual([
      'Paciente cadastrado',
      'Triagem de enfermagem',
      'Atendimento finalizado',
    ])
  })
})
