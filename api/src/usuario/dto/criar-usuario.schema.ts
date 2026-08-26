import { Papel } from '../../../generated/prisma/client';
import { z } from 'zod';

export const criarUsuarioSchema = z.object({
  nome: z.string().trim().min(3).max(120),
  email: z.email('E-mail inválido').max(160),
  senha: z.string().min(8).max(200),
  papel: z.enum(Papel),
});

export type CriarUsuarioDto = z.infer<typeof criarUsuarioSchema>;
