import { Injectable } from '@nestjs/common';
import {
  Participante,
  Prisma,
  StatusAtendimento,
  TipoTokenSala,
} from '../../generated/prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

export interface RegistrarTokenSala {
  atendimentoId: string;
  tokenHash: string;
  participante: Participante;
  tipo: TipoTokenSala;
  usuarioId: string | null;
  expiraEm: Date;
}

@Injectable()
export class SalaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async registrarAcessoProfissionalSeAtivo(
    dados: RegistrarTokenSala & { usuarioId: string },
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      if (
        !(await this.bloquearAtendimentoAtivo(
          tx,
          dados.atendimentoId,
          dados.usuarioId,
        ))
      ) {
        return false;
      }

      const agora = new Date();
      await tx.salaToken.updateMany({
        where: {
          atendimentoId: dados.atendimentoId,
          usuarioId: dados.usuarioId,
          participante: Participante.PROFISSIONAL,
          tipo: TipoTokenSala.ACESSO_LIVEKIT,
          revogadoEm: null,
        },
        data: { revogadoEm: agora },
      });
      await tx.salaToken.create({ data: dados });
      return true;
    });
  }

  async registrarLinkPacienteSeAtivo(
    dados: RegistrarTokenSala,
    profissionalId: string,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      if (
        !(await this.bloquearAtendimentoAtivo(
          tx,
          dados.atendimentoId,
          profissionalId,
        ))
      ) {
        return false;
      }

      await tx.salaToken.updateMany({
        where: {
          atendimentoId: dados.atendimentoId,
          participante: Participante.PACIENTE,
          revogadoEm: null,
        },
        data: { revogadoEm: new Date() },
      });
      await tx.salaToken.create({ data: dados });
      return true;
    });
  }

  async buscarContextoDoLink(
    tokenHash: string,
    atendimentoId: string,
    agora: Date,
  ) {
    return this.prisma.salaToken.findFirst({
      where: {
        tokenHash,
        atendimentoId,
        participante: Participante.PACIENTE,
        tipo: TipoTokenSala.LINK_PACIENTE,
        usadoEm: null,
        revogadoEm: null,
        expiraEm: { gt: agora },
        atendimento: { status: StatusAtendimento.EM_ANDAMENTO },
      },
      select: {
        expiraEm: true,
        atendimento: {
          select: {
            paciente: { select: { id: true, nome: true } },
          },
        },
      },
    });
  }

  async consumirLinkERegistrarAcesso(
    tokenHash: string,
    dados: RegistrarTokenSala,
    agora: Date,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      if (!(await this.bloquearAtendimentoAtivo(tx, dados.atendimentoId))) {
        return false;
      }

      const { count } = await tx.salaToken.updateMany({
        where: {
          tokenHash,
          atendimentoId: dados.atendimentoId,
          participante: Participante.PACIENTE,
          tipo: TipoTokenSala.LINK_PACIENTE,
          usadoEm: null,
          revogadoEm: null,
          expiraEm: { gt: agora },
        },
        data: { usadoEm: agora },
      });
      if (count === 0) {
        return false;
      }
      await tx.salaToken.create({ data: dados });
      return true;
    });
  }

  async buscarContextoDoAcessoPaciente(
    tokenHash: string,
    atendimentoId: string,
    agora: Date,
  ) {
    return this.prisma.salaToken.findFirst({
      where: {
        tokenHash,
        atendimentoId,
        participante: Participante.PACIENTE,
        tipo: TipoTokenSala.ACESSO_LIVEKIT,
        revogadoEm: null,
        expiraEm: { gt: agora },
        atendimento: { status: StatusAtendimento.EM_ANDAMENTO },
      },
      select: {
        atendimento: {
          select: {
            paciente: { select: { nome: true } },
          },
        },
      },
    });
  }

  async renovarAcessoPaciente(
    tokenHashAtual: string,
    dados: RegistrarTokenSala,
    agora: Date,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      if (!(await this.bloquearAtendimentoAtivo(tx, dados.atendimentoId))) {
        return false;
      }

      const { count } = await tx.salaToken.updateMany({
        where: {
          tokenHash: tokenHashAtual,
          atendimentoId: dados.atendimentoId,
          participante: Participante.PACIENTE,
          tipo: TipoTokenSala.ACESSO_LIVEKIT,
          revogadoEm: null,
          expiraEm: { gt: agora },
        },
        data: { revogadoEm: agora },
      });
      if (count === 0) {
        return false;
      }

      await tx.salaToken.create({ data: dados });
      return true;
    });
  }

  async profissionalDoAtendimento(
    atendimentoId: string,
  ): Promise<string | null> {
    const atendimento = await this.prisma.atendimento.findUnique({
      where: { id: atendimentoId },
      select: { profissionalId: true },
    });
    return atendimento?.profissionalId ?? null;
  }

  private async bloquearAtendimentoAtivo(
    tx: Prisma.TransactionClient,
    atendimentoId: string,
    profissionalId?: string,
  ): Promise<boolean> {
    const linhas = profissionalId
      ? await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
          SELECT id
          FROM Atendimento
          WHERE id = ${atendimentoId}
            AND profissionalId = ${profissionalId}
            AND status = 'EM_ANDAMENTO'
          FOR UPDATE
        `)
      : await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
          SELECT id
          FROM Atendimento
          WHERE id = ${atendimentoId}
            AND status = 'EM_ANDAMENTO'
          FOR UPDATE
        `);
    return linhas.length === 1;
  }
}
