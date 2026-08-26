import { z } from 'zod';

export const editarProntuarioSchema = z
  .object({
    anamnese: z.string().trim().min(3).max(20_000).optional(),
    conduta: z.string().trim().min(3).max(20_000).optional(),
    prescricao: z.string().trim().max(20_000).nullable().optional(),
  })
  .refine((dados) => Object.keys(dados).length > 0, {
    message: 'Informe pelo menos um campo para atualizar',
  });

export type EditarProntuarioDto = z.infer<typeof editarProntuarioSchema>;
