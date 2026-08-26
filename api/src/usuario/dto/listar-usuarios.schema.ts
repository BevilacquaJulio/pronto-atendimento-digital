import { Papel } from '../../../generated/prisma/client';
import { z } from 'zod';

export const listarUsuariosSchema = z.object({
  busca: z.string().trim().min(1).max(160).optional(),
  papel: z.enum(Papel).optional(),
  ativo: z
    .enum(['true', 'false'])
    .transform((valor) => valor === 'true')
    .optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListarUsuariosDto = z.infer<typeof listarUsuariosSchema>;
