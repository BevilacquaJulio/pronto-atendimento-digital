import { AxiosError } from 'axios'
import { api } from '../../lib/api'
import type { MedicalRecord, MedicalRecordInput } from './prontuario.types'

export async function getMedicalRecord(attendanceId: string) {
  try {
    const { data } = await api.get<MedicalRecord>(
      `/atendimentos/${attendanceId}/prontuario`,
    )
    return data
  } catch (error) {
    if (error instanceof AxiosError && error.response?.status === 404) {
      return null
    }
    throw error
  }
}

export async function createMedicalRecord({
  attendanceId,
  input,
}: {
  attendanceId: string
  input: MedicalRecordInput
}) {
  const { data } = await api.post<MedicalRecord>(
    `/atendimentos/${attendanceId}/prontuario`,
    input,
  )
  return data
}

export async function updateMedicalRecord({
  recordId,
  input,
}: {
  recordId: string
  input: MedicalRecordInput
}) {
  const { data } = await api.patch<MedicalRecord>(
    `/prontuarios/${recordId}`,
    input,
  )
  return data
}
