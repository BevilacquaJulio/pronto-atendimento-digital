import { Papel } from '../../../generated/prisma/client';
import { z } from 'zod';

export const editarUsuarioSchema = z
  .object({
    nome: z.string().trim().min(3).max(120).optional(),
    senha: z.string().min(8).max(200).optional(),
    papel: z.enum(Papel).optional(),
    ativo: z.boolean().optional(),
  })
  .refine((dados) => Object.keys(dados).length > 0, {
    message: 'Informe pelo menos um campo para atualizar',
  });

export type EditarUsuarioDto = z.infer<typeof editarUsuarioSchema>;
