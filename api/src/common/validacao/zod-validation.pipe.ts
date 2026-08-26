import { BadRequestException, PipeTransform } from '@nestjs/common';
import { ZodType } from 'zod';

interface CampoInvalido {
  campo: string;
  erro: string;
}

// Valida corpo e query com Zod. O DTO é o schema; o tipo sai de z.infer.
//
// A resposta lista campo a campo em vez de devolver a primeira falha: quem
// consome a API corrige tudo de uma vez em vez de descobrir um erro por
// tentativa.
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(valor: unknown): T {
    const resultado = this.schema.safeParse(valor);

    if (!resultado.success) {
      const campos: CampoInvalido[] = resultado.error.issues.map((issue) => ({
        campo: issue.path.join('.') || '(raiz)',
        erro: issue.message,
      }));

      throw new BadRequestException({
        codigo: 'REQUISICAO_INVALIDA',
        mensagem: 'Dados inválidos',
        campos,
      });
    }

    return resultado.data;
  }
}
