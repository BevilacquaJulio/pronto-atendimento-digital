import { api } from '../../lib/api'
import type { PatientInvite, RoomAccess } from './sala.types'

export async function createProfessionalRoomAccess(attendanceId: string) {
  const { data } = await api.post<RoomAccess>(
    `/atendimentos/${attendanceId}/sala/token`,
  )
  return data
}

export async function exchangePatientLink({
  token,
  attendanceId,
}: {
  token: string
  attendanceId: string
}) {
  const { data } = await api.post<RoomAccess>(`/sala/${token}/entrar`, {
    atendimentoId: attendanceId,
  })
  return data
}

export async function renewPatientRoomAccess({
  attendanceId,
  token,
}: {
  attendanceId: string
  token: string
}) {
  const { data } = await api.post<RoomAccess>(`/sala/${attendanceId}/renovar`, {
    token,
  })
  return data
}

export async function createPatientInvite(attendanceId: string) {
  const { data } = await api.post<PatientInvite>(
    `/atendimentos/${attendanceId}/sala/link-paciente`,
  )
  return data
}
