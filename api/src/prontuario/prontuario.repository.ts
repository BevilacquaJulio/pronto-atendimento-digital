import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import type { CriarAdendoDto } from './dto/criar-adendo.schema';
import type { CriarProntuarioDto } from './dto/criar-prontuario.schema';
import type { EditarProntuarioDto } from './dto/editar-prontuario.schema';

@Injectable()
export class ProntuarioRepository {
  constructor(private readonly prisma: PrismaService) {}

  async buscarPorAtendimento(atendimentoId: string) {
    return this.prisma.prontuario.findUnique({
      where: { atendimentoId },
      select: {
        id: true,
        atendimentoId: true,
        autorId: true,
        anamnese: true,
        conduta: true,
        prescricao: true,
        finalizadoEm: true,
        criadoEm: true,
        atualizadoEm: true,
        autor: { select: { nome: true } },
        adendos: {
          orderBy: { criadoEm: 'asc' },
          select: {
            id: true,
            texto: true,
            criadoEm: true,
            autor: { select: { id: true, nome: true } },
          },
        },
      },
    });
  }

  async criarSeAtendimentoAtivo(
    atendimentoId: string,
    autorId: string,
    dto: CriarProntuarioDto,
  ): Promise<string | null> {
    return this.prisma.$transaction(async (tx) => {
      // O bloqueio da linha fecha a corrida entre "está em andamento?" e o
      // INSERT. A finalização usa UPDATE na mesma linha e precisa aguardar:
      // ou o prontuário nasce antes dela, ou a criação enxerga o estado final.
      const atendimentos = await tx.$queryRaw<Array<{ id: string }>>(
        Prisma.sql`
          SELECT id
          FROM Atendimento
          WHERE id = ${atendimentoId}
            AND profissionalId = ${autorId}
            AND status = 'EM_ANDAMENTO'
          FOR UPDATE
        `,
      );
      if (atendimentos.length === 0) {
        return null;
      }

      const prontuario = await tx.prontuario.create({
        data: {
          atendimentoId,
          autorId,
          anamnese: dto.anamnese,
          conduta: dto.conduta,
          prescricao: dto.prescricao,
        },
        select: { id: true },
      });
      return prontuario.id;
    });
  }

  async buscarMetadados(id: string) {
    return this.prisma.prontuario.findUnique({
      where: { id },
      select: {
        autorId: true,
        atendimentoId: true,
        finalizadoEm: true,
        atendimento: {
          select: { profissionalId: true, status: true },
        },
      },
    });
  }

  async editar(
    id: string,
    autorId: string,
    dto: EditarProntuarioDto,
  ): Promise<number> {
    const { count } = await this.prisma.prontuario.updateMany({
      where: { id, autorId, finalizadoEm: null },
      data: dto,
    });
    return count;
  }

  async criarAdendo(
    prontuarioId: string,
    autorId: string,
    dto: CriarAdendoDto,
  ): Promise<string> {
    const adendo = await this.prisma.prontuarioAdendo.create({
      data: { prontuarioId, autorId, texto: dto.texto },
      select: { id: true },
    });
    return adendo.id;
  }
}
