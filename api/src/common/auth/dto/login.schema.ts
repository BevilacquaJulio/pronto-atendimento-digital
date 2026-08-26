import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email({ message: 'E-mail inválido' }).max(160),
  senha: z.string().min(1, 'Senha obrigatória').max(200),
});

export type LoginDto = z.infer<typeof loginSchema>;
