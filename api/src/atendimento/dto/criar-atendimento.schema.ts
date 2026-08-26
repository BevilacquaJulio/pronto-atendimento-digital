import { z } from 'zod';

export const criarAtendimentoSchema = z.object({
  pacienteId: z.uuid('Paciente inválido'),
});

export type CriarAtendimentoDto = z.infer<typeof criarAtendimentoSchema>;
