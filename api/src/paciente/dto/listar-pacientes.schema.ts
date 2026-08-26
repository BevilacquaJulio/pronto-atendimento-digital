import { z } from 'zod';

export const listarPacientesSchema = z.object({
  busca: z.string().trim().min(1).max(160).optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListarPacientesDto = z.infer<typeof listarPacientesSchema>;
