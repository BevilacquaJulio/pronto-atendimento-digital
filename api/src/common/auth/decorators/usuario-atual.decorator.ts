import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { UsuarioAutenticado } from '../tipos';

/**
 * Injeta o usuário do token no handler.
 *
 * Existe para que nenhum service precise ler `request.user` na mão, e
 * principalmente para que a identidade venha **sempre** do token — nunca de
 * um `usuarioId` que o cliente mandou no corpo, que é falsificável.
 */
export const UsuarioAtual = createParamDecorator(
  (_dados: unknown, ctx: ExecutionContext): UsuarioAutenticado => {
    const requisicao = ctx
      .switchToHttp()
      .getRequest<Request & { user?: UsuarioAutenticado }>();

    if (!requisicao.user) {
      // Só acontece se alguém usar o decorator numa rota @Publico().
      throw new Error(
        '@UsuarioAtual usado em rota sem autenticação — revise os guards',
      );
    }

    return requisicao.user;
  },
);
