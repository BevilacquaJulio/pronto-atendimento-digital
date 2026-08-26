import { z } from 'zod'

export const createUserSchema = z.object({
  nome: z.string().trim().min(3, 'Informe o nome completo').max(120),
  email: z.string().trim().email('Informe um e-mail válido').max(160),
  senha: z.string().min(8, 'Use pelo menos 8 caracteres').max(200),
  papel: z.enum(['ADMIN', 'ENFERMEIRO', 'MEDICO']),
})
