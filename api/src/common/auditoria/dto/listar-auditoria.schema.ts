import { z } from 'zod';

export const listarAuditoriaSchema = z.object({
  usuarioId: z.uuid().optional(),
  pacienteId: z.uuid().optional(),
  acao: z.string().trim().min(1).max(60).optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListarAuditoriaDto = z.infer<typeof listarAuditoriaSchema>;
