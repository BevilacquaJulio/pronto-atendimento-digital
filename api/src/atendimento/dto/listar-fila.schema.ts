import { z } from 'zod';
import { Risco, StatusAtendimento } from '../../../generated/prisma/client';

/**
 * A fila aceita mais de um valor no mesmo filtro (`?risco=VERMELHO,LARANJA`)
 * porque as decisões clínicas são combinadas: "quem está aberto e grave" é uma
 * pergunta só, não duas. Um valor único continua funcionando — vira uma lista
 * de um elemento — então nada que já chamava a rota quebra.
 */
function listaDeEnum<T extends Record<string, string>>(enumerado: T) {
  return z
    .preprocess(
      (valor) =>
        typeof valor === 'string'
          ? valor
              .split(',')
              .map((parte) => parte.trim())
              .filter(Boolean)
          : valor,
      z.array(z.enum(enumerado)).min(1).max(8),
    )
    .optional();
}

// Query string chega sempre como texto, então os números vêm com coerce.
export const listarFilaSchema = z.object({
  busca: z.string().trim().min(1).max(160).optional(),
  status: listaDeEnum(StatusAtendimento),
  risco: listaDeEnum(Risco),
  periodo: z.enum(['hoje', 'ontem', 'ultima_semana', 'todos']).default('todos'),
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListarFilaDto = z.infer<typeof listarFilaSchema>;
