export type RoomAccess = {
  token: string
  url: string
  sala: string
  atendimentoId: string
  participante: 'PROFISSIONAL' | 'PACIENTE'
  expiraEm: string
}

export type PatientInvite = {
  token: string
  atendimentoId: string
  expiraEm: string
  link: string
}
