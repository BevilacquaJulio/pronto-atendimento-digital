import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Informe um e-mail válido').max(160),
  senha: z.string().min(1, 'Informe sua senha').max(200),
})
