import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { Papel } from '../../../generated/prisma/client';
import type { UsuarioAutenticado } from '../auth/tipos';
import type { ConfiguracaoAuditavel } from './auditavel.decorator';
import {
  AuditoriaRepository,
  type NovoLogAuditoria,
} from './auditoria.repository';
import type { ListarAuditoriaDto } from './dto/listar-auditoria.schema';

const FORMATO_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class AuditoriaService {
  constructor(private readonly repo: AuditoriaRepository) {}

  async registrar(
    requisicao: Request,
    config: ConfiguracaoAuditavel,
    statusHttp: number,
  ): Promise<void> {
    const id = this.identificadorDoRecurso(requisicao, config);
    const contexto =
      id && FORMATO_UUID.test(id)
        ? await this.resolverContexto(config, id)
        : null;
    const usuario = this.usuarioAutenticado(requisicao.user);
    const dados: NovoLogAuditoria = {
      usuarioId: usuario?.id ?? null,
      papel: usuario?.papel ?? null,
      acao: config.acao,
      pacienteId: contexto?.pacienteId ?? null,
      atendimentoId: contexto?.atendimentoId ?? null,
      // Query strings podem carregar buscas por CPF ou nome. Para auditoria
      // basta a rota; copiar a consulta criaria um segundo repositório de PII.
      endpoint: this.endpointSeguro(requisicao),
      metodo: requisicao.method.slice(0, 10),
      statusHttp,
      ip: requisicao.ip?.slice(0, 45) ?? null,
      userAgent: requisicao.get('user-agent')?.slice(0, 300) ?? null,
    };
    await this.repo.criar(dados);
  }

  private identificadorDoRecurso(
    requisicao: Request,
    config: ConfiguracaoAuditavel,
  ): string | undefined {
    if (config.param) {
      const parametro = requisicao.params[config.param];
      return Array.isArray(parametro) ? parametro[0] : parametro;
    }
    if (
      config.bodyField &&
      typeof requisicao.body === 'object' &&
      requisicao.body !== null &&
      config.bodyField in requisicao.body
    ) {
      const valor: unknown = (requisicao.body as Record<string, unknown>)[
        config.bodyField
      ];
      return typeof valor === 'string' ? valor : undefined;
    }
    return undefined;
  }

  private endpointSeguro(requisicao: Request): string {
    const rota: unknown = requisicao.route;
    if (
      typeof rota === 'object' &&
      rota !== null &&
      'path' in rota &&
      typeof rota.path === 'string'
    ) {
      return `${requisicao.baseUrl}${rota.path}`.slice(0, 200);
    }
    return requisicao.path.slice(0, 200);
  }

  async listar(filtros: ListarAuditoriaDto) {
    const { itens, total } = await this.repo.listar(filtros);
    return {
      itens,
      total,
      pagina: filtros.pagina,
      porPagina: filtros.porPagina,
      paginas: Math.ceil(total / filtros.porPagina),
    };
  }

  private async resolverContexto(
    config: ConfiguracaoAuditavel,
    id: string,
  ): Promise<{ atendimentoId: string | null; pacienteId: string } | null> {
    if (config.recurso === 'atendimento') {
      return this.repo.resolverAtendimento(id);
    }
    if (config.recurso === 'prontuario') {
      return this.repo.resolverProntuario(id);
    }
    return (await this.repo.pacienteExiste(id))
      ? { atendimentoId: null, pacienteId: id }
      : null;
  }

  private usuarioAutenticado(valor: unknown): UsuarioAutenticado | null {
    if (typeof valor !== 'object' || valor === null) {
      return null;
    }
    if (!('id' in valor) || !('nome' in valor) || !('email' in valor)) {
      return null;
    }
    const papel = 'papel' in valor ? valor.papel : null;
    if (
      typeof valor.id !== 'string' ||
      typeof valor.nome !== 'string' ||
      typeof valor.email !== 'string' ||
      (papel !== Papel.ENFERMEIRO &&
        papel !== Papel.MEDICO &&
        papel !== Papel.ADMIN)
    ) {
      return null;
    }
    return {
      id: valor.id,
      nome: valor.nome,
      email: valor.email,
      papel,
    };
  }
}
