import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Papel } from '../../../../generated/prisma/client';
import {
  CHAVE_AUDITAVEL,
  type ConfiguracaoAuditavel,
} from '../../auditoria/auditavel.decorator';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { AcessoNegado } from '../../erros/erros';
import { CHAVE_PUBLICO } from '../decorators/publico.decorator';
import { CHAVE_PAPEIS } from '../decorators/papeis.decorator';
import { UsuarioAutenticado } from '../tipos';

/**
 * Segundo guard global: o papel do usuário permite esta rota?
 *
 * O ponto que faz esse guard ser "nega por padrão" de verdade está no
 * `if (!papeis)` abaixo. A implementação ingênua é `if (!papeis) return true`
 * — "rota sem restrição é rota liberada". Aqui é o contrário: rota
 * autenticada sem @Papeis é rota negada. Assim, esquecer o decorator produz
 * um 403 na primeira chamada (barulhento, corrigido em segundos) em vez de
 * um endpoint clínico aberto (silencioso, descoberto em auditoria).
 */
@Injectable()
export class PapelGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditoria: AuditoriaService,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const publica = this.reflector.getAllAndOverride<boolean>(CHAVE_PUBLICO, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);
    if (publica) {
      return true;
    }

    const papeis = this.reflector.getAllAndOverride<Papel[] | undefined>(
      CHAVE_PAPEIS,
      [contexto.getHandler(), contexto.getClass()],
    );

    if (!papeis || papeis.length === 0) {
      await this.registrarNegado(contexto);
      throw new AcessoNegado('Rota sem papel declarado');
    }

    const requisicao = contexto
      .switchToHttp()
      .getRequest<Request & { user?: UsuarioAutenticado }>();
    const usuario = requisicao.user;

    if (!usuario || !papeis.includes(usuario.papel)) {
      await this.registrarNegado(contexto);
      throw new AcessoNegado('Seu papel não tem acesso a esta rota');
    }

    return true;
  }

  private async registrarNegado(contexto: ExecutionContext): Promise<void> {
    const config = this.reflector.getAllAndOverride<
      ConfiguracaoAuditavel | undefined
    >(CHAVE_AUDITAVEL, [contexto.getHandler(), contexto.getClass()]);
    if (!config) {
      return;
    }
    const requisicao = contexto.switchToHttp().getRequest<Request>();
    await this.auditoria.registrar(requisicao, config, 403);
  }
}
