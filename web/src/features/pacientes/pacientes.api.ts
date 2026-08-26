import { api } from '../../lib/api'
import type { PatientDetail, PatientsResponse } from './pacientes.types'

export async function listPatients(search: string, page = 1) {
  const { data } = await api.get<PatientsResponse>('/pacientes', {
    params: {
      busca: search.trim() || undefined,
      pagina: page,
      porPagina: 12,
    },
  })
  return data
}

export async function getPatient(id: string) {
  const { data } = await api.get<PatientDetail>(`/pacientes/${id}`)
  return data
}
