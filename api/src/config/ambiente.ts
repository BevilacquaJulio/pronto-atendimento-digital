import { z } from 'zod';

/**
 * Contrato das variáveis de ambiente.
 *
 * Sem isto, uma variável ausente vira erro de injeção de dependência no meio
 * do boot — uma stack trace do container do Nest apontando para a linha do
 * `getOrThrow`, que não diz ao leitor o que fazer. Com isto, a API não sobe e
 * a primeira linha do log nomeia a variável que falta.
 *
 * O `max` do TTL da sala não é preciosismo: o requisito diz "no máximo 15
 * minutos", e essa é a diferença entre uma regra que o código respeita e uma
 * regra que a configuração não consegue violar. Alguém pôr 3600 no .env é um
 * cenário bem mais provável do que alguém reescrever o service.
 */
export const ambienteSchema = z.object({
  DATABASE_URL: z.string().min(1, 'obrigatória'),

  JWT_SECRET: z
    .string()
    .min(16, 'precisa de pelo menos 16 caracteres para não ser adivinhável'),
  JWT_EXPIRES_IN: z.string().default('1h'),

  SALA_TOKEN_TTL_SEG: z.coerce
    .number()
    .int()
    .positive()
    .max(900, 'o requisito limita o token de sala a 15 minutos (900s)')
    .default(900),
  LIVEKIT_URL: z
    .url('precisa ser uma URL válida')
    .refine(
      (url) => /^(wss?|https?):\/\//.test(url),
      'use ws://, wss://, http:// ou https://',
    ),
  LIVEKIT_PUBLIC_URL: z
    .url('precisa ser uma URL válida')
    .refine(
      (url) => /^(wss?|https?):\/\//.test(url),
      'use ws://, wss://, http:// ou https://',
    )
    .optional(),
  LIVEKIT_API_KEY: z.string().min(3, 'obrigatória'),
  LIVEKIT_API_SECRET: z.string().min(16, 'precisa de pelo menos 16 caracteres'),

  API_PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
});

export type Ambiente = z.infer<typeof ambienteSchema>;

export function validarAmbiente(bruto: Record<string, unknown>): Ambiente {
  const resultado = ambienteSchema.safeParse(bruto);

  if (!resultado.success) {
    const problemas = resultado.error.issues
      .map((issue) => `  • ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new Error(
      `Ambiente inválido — a API não vai subir.\n${problemas}\n\n` +
        'Confira api/.env (ou as variáveis do compose). O modelo está em api/.env.example.',
    );
  }

  return resultado.data;
}
