import type {
  ProfessionalSummary,
  Risco,
  StatusAtendimento,
  Triage,
} from '../atendimentos/atendimentos.types'

export type PatientListItem = {
  id: string
  nome: string
  cpf: string
  contato: string
  nascimento: string
  _count: { atendimentos: number }
}

export type MedicalRecord = {
  id: string
  anamnese: string
  conduta: string
  prescricao: string | null
  finalizadoEm: string | null
  autor: { id: string; nome: string }
  adendos: Array<{
    id: string
    texto: string
    criadoEm: string
    autor: { id: string; nome: string }
  }>
}

export type PatientAttendance = {
  id: string
  status: StatusAtendimento
  risco: Risco | null
  entradaFila: string
  iniciadoEm: string | null
  finalizadoEm: string | null
  canceladoEm: string | null
  profissional: ProfessionalSummary | null
  triagem: Triage | null
  prontuario?: MedicalRecord | null
}

export type PatientDetail = Omit<PatientListItem, '_count'> & {
  atendimentos: PatientAttendance[]
}

export type PatientsResponse = {
  itens: PatientListItem[]
  total: number
  pagina: number
  porPagina: number
  paginas: number
}
