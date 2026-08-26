import { z } from 'zod'

export const medicalRecordSchema = z.object({
  anamnese: z.string().trim().min(3, 'Descreva a anamnese').max(20_000),
  conduta: z.string().trim().min(3, 'Descreva a conduta').max(20_000),
  prescricao: z.string().trim().max(20_000),
})
