import { z } from 'zod';

export const entrarSalaPacienteSchema = z.object({
  atendimentoId: z.uuid('Atendimento inválido'),
});

export const tokenOpacoSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{43}$/, 'Link de acesso inválido');

export type EntrarSalaPacienteDto = z.infer<typeof entrarSalaPacienteSchema>;
