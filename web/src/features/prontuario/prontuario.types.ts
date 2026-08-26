export type MedicalRecordInput = {
  anamnese: string
  conduta: string
  prescricao: string | null
}

export type MedicalRecord = MedicalRecordInput & {
  id: string
  atendimentoId: string
  autorId: string
  finalizadoEm: string | null
  criadoEm: string
  atualizadoEm: string
  autor: { nome: string }
  adendos: Array<{
    id: string
    texto: string
    criadoEm: string
    autor: { id: string; nome: string }
  }>
}
