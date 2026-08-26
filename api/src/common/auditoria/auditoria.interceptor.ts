import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { Observable, catchError, concatMap, from, map, throwError } from 'rxjs';
import {
  CHAVE_AUDITAVEL,
  type ConfiguracaoAuditavel,
} from './auditavel.decorator';
import { AuditoriaService } from './auditoria.service';

@Injectable()
export class AuditoriaInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditoria: AuditoriaService,
  ) {}

  intercept(
    contexto: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const config = this.reflector.getAllAndOverride<
      ConfiguracaoAuditavel | undefined
    >(CHAVE_AUDITAVEL, [contexto.getHandler(), contexto.getClass()]);
    if (!config) {
      return next.handle();
    }

    const http = contexto.switchToHttp();
    const requisicao = http.getRequest<Request>();
    const resposta = http.getResponse<Response>();

    // O log é aguardado antes de liberar a resposta. Em dado clínico, aceitar
    // a leitura e perder o rastro é pior que falhar fechado.
    return next.handle().pipe(
      catchError((erro: unknown) => {
        const status = erro instanceof HttpException ? erro.getStatus() : 500;
        return from(this.auditoria.registrar(requisicao, config, status)).pipe(
          concatMap(() => throwError(() => erro)),
        );
      }),
      concatMap((valor: unknown) =>
        from(
          this.auditoria.registrar(requisicao, config, resposta.statusCode),
        ).pipe(map(() => valor)),
      ),
    );
  }
}
