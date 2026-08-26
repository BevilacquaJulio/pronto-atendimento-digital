import { z } from 'zod';

export const cadastrarPacienteSchema = z.object({
  nome: z.string().trim().min(3, 'Informe o nome completo').max(120),
  cpf: z
    .string()
    .transform((value) => value.replace(/\D/g, ''))
    .refine((value) => value.length === 11, 'CPF deve conter 11 dígitos'),
  contato: z.string().trim().min(8, 'Informe um contato válido').max(40),
  nascimento: z.iso
    .date('Data de nascimento inválida')
    .transform((value) => new Date(`${value}T00:00:00.000Z`))
    .refine(
      (value) => value >= new Date('1900-01-01T00:00:00.000Z'),
      'Data de nascimento inválida',
    )
    .refine(
      (value) => value <= new Date(),
      'Data de nascimento não pode estar no futuro',
    ),
});

export type CadastrarPacienteDto = z.infer<typeof cadastrarPacienteSchema>;
