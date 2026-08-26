import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Papel, StatusAtendimento } from '../../../../generated/prisma/client';
import {
  CHAVE_AUDITAVEL,
  type ConfiguracaoAuditavel,
} from '../../auditoria/auditavel.decorator';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { AcessoNegado } from '../../erros/erros';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CHAVE_ESCOPO,
  ConfiguracaoDeEscopo,
} from '../decorators/escopo.decorator';
import { UsuarioAutenticado } from '../tipos';

const FORMATO_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Terceiro guard global: este recurso é dele?
 *
 * Papel responde "médico pode ler prontuário". Escopo responde "mas este
 * prontuário, não". Sem essa camada, um médico autenticado troca o :id da URL
 * e lê o paciente de outro. É a variação mais barata de IDOR e, por isso, a
 * primeira que alguém tenta.
 *
 * Só age onde há @Escopo(). Rota sem o decorator não é "liberada": é rota que
 * não opera sobre recurso de terceiro (a fila, por exemplo, já é filtrada
 * por papel e não recebe id).
 */
@Injectable()
export class EscopoGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const config = this.reflector.getAllAndOverride<
      ConfiguracaoDeEscopo | undefined
    >(CHAVE_ESCOPO, [contexto.getHandler(), contexto.getClass()]);

    if (!config) {
      return true;
    }

    const requisicao = contexto
      .switchToHttp()
      .getRequest<
        Request & { user?: UsuarioAutenticado; params: Record<string, string> }
      >();

    const usuario = requisicao.user;
    if (!usuario) {
      throw new AcessoNegado();
    }

    try {
      const id = requisicao.params[config.param];
      if (!id) {
        throw new AcessoNegado('Recurso não identificado na rota');
      }

      // Guard roda antes dos pipes no ciclo do Nest, então o ParseUUIDPipe do
      // controller ainda não validou nada. Sem esta checagem, `/atendimentos/abc`
      // chegaria ao Prisma com um uuid inválido e viraria 500 — erro de
      // servidor para o que é, na verdade, entrada malformada do cliente.
      if (!FORMATO_UUID.test(id)) {
        throw new AcessoNegado();
      }

      if (config.tipo === 'atendimento') {
        return await this.verificarAtendimento(id, usuario, config);
      }

      if (config.tipo === 'prontuario') {
        return await this.verificarProntuario(id, usuario);
      }

      if (config.tipo === 'paciente') {
        return await this.verificarPaciente(id, usuario);
      }

      return false;
    } catch (erro) {
      if (erro instanceof AcessoNegado) {
        await this.registrarNegado(contexto, requisicao);
      }
      throw erro;
    }
  }

  private async verificarAtendimento(
    id: string,
    usuario: UsuarioAutenticado,
    config: ConfiguracaoDeEscopo,
  ): Promise<boolean> {
    const atendimento = await this.prisma.atendimento.findUnique({
      where: { id },
      select: { profissionalId: true, status: true, encaminhadoDeId: true },
    });

    // Inexistente também é 403, não 404. Responder 404 aqui transformaria a
    // rota num oráculo de existência: bastaria varrer ids e separar os 403
    // dos 404 para mapear quantos atendimentos o sistema tem.
    if (!atendimento) {
      throw new AcessoNegado();
    }

    // A ausência de profissional não basta para liberar o recurso: atendimentos
    // cancelados antes de serem assumidos também ficam com profissionalId nulo.
    // A exceção existe somente para a fila AGUARDANDO, quando o vínculo ainda
    // não foi criado e o profissional precisa abrir o item antes de assumi-lo.
    if (atendimento.profissionalId === null) {
      if (
        config.permitirSemVinculo &&
        atendimento.status === StatusAtendimento.AGUARDANDO &&
        !(usuario.papel === Papel.ENFERMEIRO && atendimento.encaminhadoDeId)
      ) {
        return true;
      }
      throw new AcessoNegado();
    }

    if (atendimento.profissionalId !== usuario.id) {
      throw new AcessoNegado();
    }

    return true;
  }

  private async verificarProntuario(
    id: string,
    usuario: UsuarioAutenticado,
  ): Promise<boolean> {
    const prontuario = await this.prisma.prontuario.findUnique({
      where: { id },
      select: { atendimento: { select: { profissionalId: true } } },
    });
    if (!prontuario || prontuario.atendimento.profissionalId !== usuario.id) {
      throw new AcessoNegado();
    }
    return true;
  }

  private async verificarPaciente(
    id: string,
    usuario: UsuarioAutenticado,
  ): Promise<boolean> {
    const paciente = await this.prisma.paciente.findFirst({
      where: {
        id,
        atendimentos: {
          some: {
            OR: [
              { profissionalId: usuario.id },
              {
                status: StatusAtendimento.AGUARDANDO,
                ...(usuario.papel === Papel.ENFERMEIRO
                  ? { encaminhadoDeId: null }
                  : {}),
              },
            ],
          },
        },
      },
      select: { id: true },
    });
    if (!paciente) {
      throw new AcessoNegado();
    }
    return true;
  }

  private async registrarNegado(
    contexto: ExecutionContext,
    requisicao: Request,
  ): Promise<void> {
    const config = this.reflector.getAllAndOverride<
      ConfiguracaoAuditavel | undefined
    >(CHAVE_AUDITAVEL, [contexto.getHandler(), contexto.getClass()]);
    if (config) {
      await this.auditoria.registrar(requisicao, config, 403);
    }
  }
}
