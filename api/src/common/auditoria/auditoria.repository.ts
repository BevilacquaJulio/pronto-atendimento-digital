import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { ListarAuditoriaDto } from './dto/listar-auditoria.schema';

export interface NovoLogAuditoria {
  usuarioId: string | null;
  papel: string | null;
  acao: string;
  pacienteId: string | null;
  atendimentoId: string | null;
  endpoint: string;
  metodo: string;
  statusHttp: number;
  ip: string | null;
  userAgent: string | null;
}

@Injectable()
export class AuditoriaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async criar(dados: NovoLogAuditoria): Promise<void> {
    await this.prisma.logAuditoria.create({ data: dados });
  }

  async listar(filtros: ListarAuditoriaDto) {
    const where: Prisma.LogAuditoriaWhereInput = {
      ...(filtros.usuarioId ? { usuarioId: filtros.usuarioId } : {}),
      ...(filtros.pacienteId ? { pacienteId: filtros.pacienteId } : {}),
      ...(filtros.acao ? { acao: filtros.acao } : {}),
    };
    const [itens, total] = await this.prisma.$transaction([
      this.prisma.logAuditoria.findMany({
        where,
        orderBy: { criadoEm: 'desc' },
        skip: (filtros.pagina - 1) * filtros.porPagina,
        take: filtros.porPagina,
        select: {
          id: true,
          usuarioId: true,
          papel: true,
          acao: true,
          pacienteId: true,
          atendimentoId: true,
          endpoint: true,
          metodo: true,
          statusHttp: true,
          ip: true,
          userAgent: true,
          criadoEm: true,
          usuario: { select: { nome: true, email: true } },
        },
      }),
      this.prisma.logAuditoria.count({ where }),
    ]);
    return { itens, total };
  }

  async resolverAtendimento(
    id: string,
  ): Promise<{ atendimentoId: string; pacienteId: string } | null> {
    const item = await this.prisma.atendimento.findUnique({
      where: { id },
      select: { id: true, pacienteId: true },
    });
    return item
      ? { atendimentoId: item.id, pacienteId: item.pacienteId }
      : null;
  }

  async resolverProntuario(
    id: string,
  ): Promise<{ atendimentoId: string; pacienteId: string } | null> {
    const item = await this.prisma.prontuario.findUnique({
      where: { id },
      select: {
        atendimentoId: true,
        atendimento: { select: { pacienteId: true } },
      },
    });
    return item
      ? {
          atendimentoId: item.atendimentoId,
          pacienteId: item.atendimento.pacienteId,
        }
      : null;
  }

  async pacienteExiste(id: string): Promise<boolean> {
    const item = await this.prisma.paciente.findUnique({
      where: { id },
      select: { id: true },
    });
    return item !== null;
  }
}
