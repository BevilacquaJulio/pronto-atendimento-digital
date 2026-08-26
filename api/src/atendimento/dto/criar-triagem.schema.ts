import { Risco } from '../../../generated/prisma/client';
import { z } from 'zod';

export const criarTriagemSchema = z.object({
  risco: z.enum(Risco),
  queixa: z.string().trim().min(3).max(4_000),
  pa: z
    .string()
    .trim()
    .regex(/^\d{2,3}\/\d{2,3}$/, 'Use o formato 120/80')
    .optional(),
  fc: z.coerce.number().int().min(20).max(300).optional(),
  temperatura: z.coerce.number().min(30).max(45).optional(),
  satO2: z.coerce.number().int().min(50).max(100).optional(),
});

export type CriarTriagemDto = z.infer<typeof criarTriagemSchema>;
