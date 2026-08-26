import { z } from 'zod';

export const criarProntuarioSchema = z.object({
  anamnese: z.string().trim().min(3).max(20_000),
  conduta: z.string().trim().min(3).max(20_000),
  prescricao: z.string().trim().max(20_000).nullable().optional(),
});

export type CriarProntuarioDto = z.infer<typeof criarProntuarioSchema>;
