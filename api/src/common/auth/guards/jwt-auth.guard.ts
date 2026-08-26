import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { CHAVE_PUBLICO } from '../decorators/publico.decorator';

/**
 * Primeiro dos três guards globais: a requisição está autenticada?
 *
 * Registrado como APP_GUARD, então vale para todas as rotas. Só sai da frente
 * onde existe @Publico() explícito.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(contexto: ExecutionContext) {
    const publica = this.reflector.getAllAndOverride<boolean>(CHAVE_PUBLICO, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);

    if (publica) {
      return true;
    }

    return super.canActivate(contexto);
  }
}
