export type StatusAtendimento =
  | 'AGUARDANDO'
  | 'EM_ANDAMENTO'
  | 'FINALIZADO'
  | 'CANCELADO'

export type Risco = 'VERMELHO' | 'LARANJA' | 'AMARELO' | 'VERDE' | 'AZUL'

export type PatientSummary = {
  id: string
  nome: string
  cpf: string
  contato: string
  nascimento?: string
}

export type ProfessionalSummary = {
  id: string
  nome: string
  papel?: string
}

export type Triage = {
  queixa: string
  pa: string | null
  fc: number | null
  /**
   * `Decimal` no banco. No JSON da API chega como string ("37.2"), não
   * como number — tratar só como número quebra a ficha do paciente.
   */
  temperatura: number | string | null
  satO2: number | null
  criadoEm: string
}

export type AttendanceListItem = {
  id: string
  status: StatusAtendimento
  risco: Risco | null
  entradaFila: string
  iniciadoEm: string | null
  paciente: PatientSummary
  profissional: ProfessionalSummary | null
  encaminhadoDeId: string | null
  encaminhadoPara: { id: string } | null
}

export type AttendanceDetail = AttendanceListItem & {
  finalizadoEm: string | null
  canceladoEm: string | null
  triagem: Triage | null
  encaminhadoDe: {
    id: string
    profissional: ProfessionalSummary | null
    triagem: Triage | null
  } | null
}

export type QueueFilters = {
  busca?: string
  /** Listas: a API aceita `?status=AGUARDANDO,EM_ANDAMENTO`. */
  status?: StatusAtendimento[]
  risco?: Risco[]
  periodo: 'hoje' | 'ontem' | 'ultima_semana' | 'todos'
  pagina: number
  porPagina: number
}

/**
 * Contagens do período inteiro, independentes de paginação e dos filtros de
 * status/risco. Antes a tela somava a página atual, então "3 de alta
 * prioridade" queria dizer "3 entre os 10 visíveis" — número errado numa
 * decisão de fila.
 */
export type QueueSummary = {
  totalPeriodo: number
  aguardando: number
  emAndamento: number
  finalizados: number
  cancelados: number
  /** Vermelho ou laranja ainda em aberto. */
  altaPrioridade: number
  semTriagem: number
}

export type QueueResponse = {
  itens: AttendanceListItem[]
  atendimentoAtivo: AttendanceListItem | null
  resumo: QueueSummary
  total: number
  pagina: number
  porPagina: number
  paginas: number
}

export type TriageInput = {
  risco: Risco
  queixa: string
  pa?: string
  fc?: number
  temperatura?: number
  satO2?: number
}

export type RegisterPatientInput = {
  nome: string
  cpf: string
  contato: string
  nascimento: string
}
