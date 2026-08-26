import { api } from '../../lib/api'
import type {
  AttendanceDetail,
  QueueFilters,
  QueueResponse,
  RegisterPatientInput,
  TriageInput,
} from './atendimentos.types'

export async function listQueue(filters: QueueFilters) {
  // Arrays viram lista separada por vírgula (`status=AGUARDANDO,EM_ANDAMENTO`),
  // que é o formato que `listarFilaSchema` desserializa. Sem isso, o axios
  // mandaria `status[]=` repetido e o Zod recusaria.
  const params = Object.fromEntries(
    Object.entries(filters)
      .filter(([, value]) => value !== undefined && value !== '')
      .map(([key, value]) => [
        key,
        Array.isArray(value) ? value.join(',') : value,
      ]),
  )
  const { data } = await api.get<QueueResponse>('/atendimentos', { params })
  return data
}

export async function registerPatient(input: RegisterPatientInput) {
  const { data } = await api.post<AttendanceDetail>(
    '/atendimentos/cadastrar-paciente',
    input,
  )
  return data
}

export async function startAttendance(id: string) {
  const { data } = await api.post<AttendanceDetail>(
    `/atendimentos/${id}/iniciar`,
  )
  return data
}

export async function getAttendance(id: string) {
  const { data } = await api.get<AttendanceDetail>(`/atendimentos/${id}`)
  return data
}

export async function createTriage({
  attendanceId,
  input,
}: {
  attendanceId: string
  input: TriageInput
}) {
  const { data } = await api.post<AttendanceDetail>(
    `/atendimentos/${attendanceId}/triagem`,
    input,
  )
  return data
}

export async function forwardAttendance(attendanceId: string) {
  const { data } = await api.post<AttendanceDetail>(
    `/atendimentos/${attendanceId}/encaminhar`,
  )
  return data
}

export async function finalizeAttendance(attendanceId: string) {
  const { data } = await api.post<AttendanceDetail>(
    `/atendimentos/${attendanceId}/finalizar`,
  )
  return data
}
