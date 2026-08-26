import { z } from 'zod';

export const renovarSalaPacienteSchema = z.object({
  token: z
    .string()
    .min(20, 'Credencial da sala inválida')
    .max(4096, 'Credencial da sala inválida'),
});

export type RenovarSalaPacienteDto = z.infer<typeof renovarSalaPacienteSchema>;
