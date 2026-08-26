import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import {
  AcessoNegado,
  ConflitoDeEstado,
  RecursoNaoEncontrado,
  TransicaoInvalida,
} from '../common/erros/erros';
import type { CriarAdendoDto } from './dto/criar-adendo.schema';
import type { CriarProntuarioDto } from './dto/criar-prontuario.schema';
import type { EditarProntuarioDto } from './dto/editar-prontuario.schema';
import { ProntuarioRepository } from './prontuario.repository';

@Injectable()
export class ProntuarioService {
  constructor(private readonly repo: ProntuarioRepository) {}

  async buscarPorAtendimento(atendimentoId: string) {
    const prontuario = await this.repo.buscarPorAtendimento(atendimentoId);
    if (!prontuario) {
      throw new RecursoNaoEncontrado('Prontuário');
    }
    return prontuario;
  }

  async criar(atendimentoId: string, autorId: string, dto: CriarProntuarioDto) {
    try {
      const id = await this.repo.criarSeAtendimentoAtivo(
        atendimentoId,
        autorId,
        dto,
      );
      if (!id) {
        throw new TransicaoInvalida(
          'O prontuário só pode ser criado durante o atendimento médico em andamento',
        );
      }
    } catch (erro) {
      if (
        erro instanceof Prisma.PrismaClientKnownRequestError &&
        erro.code === 'P2002'
      ) {
        throw new ConflitoDeEstado(
          'Este atendimento já possui prontuário',
          'PRONTUARIO_JA_EXISTE',
        );
      }
      throw erro;
    }
    return this.buscarPorAtendimento(atendimentoId);
  }

  async editar(id: string, autorId: string, dto: EditarProntuarioDto) {
    const prontuario = await this.exigirMetadados(id);
    if (prontuario.autorId !== autorId) {
      throw new AcessoNegado('Somente o autor pode editar o prontuário');
    }
    if (prontuario.finalizadoEm !== null) {
      throw new ConflitoDeEstado(
        'Prontuário finalizado é imutável; registre a correção por adendo',
        'PRONTUARIO_IMUTAVEL',
      );
    }
    if (prontuario.atendimento.status !== 'EM_ANDAMENTO') {
      throw new TransicaoInvalida(
        'O prontuário só pode ser editado durante o atendimento em andamento',
      );
    }

    const atualizados = await this.repo.editar(id, autorId, dto);
    if (atualizados === 0) {
      throw new ConflitoDeEstado(
        'O prontuário foi finalizado enquanto estava sendo editado',
        'PRONTUARIO_IMUTAVEL',
      );
    }
    return this.buscarPorAtendimento(prontuario.atendimentoId);
  }

  async criarAdendo(id: string, autorId: string, dto: CriarAdendoDto) {
    const prontuario = await this.exigirMetadados(id);
    if (prontuario.finalizadoEm === null) {
      throw new TransicaoInvalida(
        'Enquanto o prontuário estiver aberto, faça a correção por edição',
      );
    }
    await this.repo.criarAdendo(id, autorId, dto);
    return this.buscarPorAtendimento(prontuario.atendimentoId);
  }

  private async exigirMetadados(id: string) {
    const prontuario = await this.repo.buscarMetadados(id);
    if (!prontuario) {
      throw new RecursoNaoEncontrado('Prontuário');
    }
    return prontuario;
  }
}
