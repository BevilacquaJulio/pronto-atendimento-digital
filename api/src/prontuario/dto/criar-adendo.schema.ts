import { z } from 'zod';

export const criarAdendoSchema = z.object({
  texto: z.string().trim().min(3).max(20_000),
});

export type CriarAdendoDto = z.infer<typeof criarAdendoSchema>;
