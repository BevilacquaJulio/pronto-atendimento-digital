import type { SelectOption } from '../../components/ui/Select'
import type { Risco } from '../atendimentos/atendimentos.types'

/**
 * Opções de classificação de risco na ordem do Protocolo de Manchester —
 * do mais grave para o menos grave.
 *
 * A descrição traz o tempo-alvo de atendimento porque é isso que a
 * classificação significa na prática: escolher "amarelo" é assumir um
 * compromisso operacional, não só pintar uma etiqueta. Os tempos são os do
 * protocolo; o serviço pode ter pactuação própria.
 */
export const riskOptions: Array<SelectOption<Risco>> = [
  {
    value: 'VERMELHO',
    label: 'Vermelho — emergência',
    description: 'Atendimento imediato',
  },
  {
    value: 'LARANJA',
    label: 'Laranja — muito urgente',
    description: 'Atendimento em até 10 minutos',
  },
  {
    value: 'AMARELO',
    label: 'Amarelo — urgente',
    description: 'Atendimento em até 60 minutos',
  },
  {
    value: 'VERDE',
    label: 'Verde — pouco urgente',
    description: 'Atendimento em até 120 minutos',
  },
  {
    value: 'AZUL',
    label: 'Azul — não urgente',
    description: 'Atendimento em até 240 minutos',
  },
]
