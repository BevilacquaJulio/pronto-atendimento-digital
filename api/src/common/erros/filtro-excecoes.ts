import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface CorpoDeErro {
  codigo: string;
  mensagem: string;
}

// Número puro em vez de HttpStatus.INTERNAL_SERVER_ERROR: aqui o que importa
// é a faixa 5xx inteira, não aquele valor específico, e comparar `number` com
// membro de enum é o que o lint (com razão) reclama.
const MENOR_ERRO_DE_SERVIDOR = 500;

// Filtro global. Existe por dois motivos:
//
// 1. Uniformizar o corpo da resposta em { codigo, mensagem } — inclusive para
//    as exceções que o próprio Nest lança (401 do guard, 404 de rota).
// 2. Impedir que detalhe interno vaze. Erro não previsto vira 500 genérico:
//    a stack e a mensagem do Prisma vão para o log do servidor, nunca para o
//    cliente. Mensagem de erro do banco é material de reconhecimento para
//    quem está sondando a API.
@Catch()
export class FiltroDeExcecoes implements ExceptionFilter {
  private readonly logger = new Logger(FiltroDeExcecoes.name);

  catch(excecao: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const resposta = ctx.getResponse<Response>();
    const requisicao = ctx.getRequest<Request>();

    const { status, corpo } = this.traduzir(excecao);

    if (status >= MENOR_ERRO_DE_SERVIDOR) {
      this.logger.error(
        `${requisicao.method} ${requisicao.url} → ${status}`,
        excecao instanceof Error ? excecao.stack : String(excecao),
      );
    }

    resposta.status(status).json(corpo);
  }

  private traduzir(excecao: unknown): { status: number; corpo: CorpoDeErro } {
    if (excecao instanceof HttpException) {
      const status = excecao.getStatus();
      const resposta = excecao.getResponse();

      // Exceções de domínio já vêm no formato certo.
      if (
        typeof resposta === 'object' &&
        resposta !== null &&
        'codigo' in resposta &&
        'mensagem' in resposta
      ) {
        return { status, corpo: resposta as CorpoDeErro };
      }

      // Exceções nativas do Nest: normaliza para o mesmo formato.
      const mensagem =
        typeof resposta === 'string'
          ? resposta
          : ((resposta as { message?: string | string[] }).message ??
            excecao.message);

      return {
        status,
        corpo: {
          codigo: this.codigoPadrao(status),
          mensagem: Array.isArray(mensagem) ? mensagem.join('; ') : mensagem,
        },
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      corpo: { codigo: 'ERRO_INTERNO', mensagem: 'Erro interno do servidor' },
    };
  }

  private codigoPadrao(status: number): string {
    const mapa: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'REQUISICAO_INVALIDA',
      [HttpStatus.UNAUTHORIZED]: 'NAO_AUTENTICADO',
      [HttpStatus.FORBIDDEN]: 'ACESSO_NEGADO',
      [HttpStatus.NOT_FOUND]: 'NAO_ENCONTRADO',
      [HttpStatus.CONFLICT]: 'CONFLITO_DE_ESTADO',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'TRANSICAO_INVALIDA',
      [HttpStatus.TOO_MANY_REQUESTS]: 'EXCESSO_DE_REQUISICOES',
    };
    return mapa[status] ?? 'ERRO';
  }
}
