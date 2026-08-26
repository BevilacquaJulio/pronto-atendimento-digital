import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import { Participante, TipoTokenSala } from '../../generated/prisma/client';
import type { UsuarioAutenticado } from '../common/auth/tipos';
import { AcessoNegado, TransicaoInvalida } from '../common/erros/erros';
import type { EntrarSalaPacienteDto } from './dto/entrar-sala-paciente.schema';
import { LiveKitProvider } from './livekit.provider';
import { SalaRepository } from './sala.repository';

@Injectable()
export class SalaService {
  private readonly logger = new Logger(SalaService.name);
  private readonly ttlSegundos: number;
  private readonly atrasosDeEncerramentoMs = [100, 250];

  constructor(
    private readonly repo: SalaRepository,
    private readonly livekit: LiveKitProvider,
    config: ConfigService,
  ) {
    this.ttlSegundos = config.getOrThrow<number>('SALA_TOKEN_TTL_SEG');
  }

  emitirTokenProfissional(atendimentoId: string, usuario: UsuarioAutenticado) {
    return this.criarAcessoProfissional(atendimentoId, usuario);
  }

  renovarTokenProfissional(atendimentoId: string, usuario: UsuarioAutenticado) {
    return this.criarAcessoProfissional(atendimentoId, usuario);
  }

  async criarLinkPaciente(atendimentoId: string, profissionalId: string) {
    const token = randomBytes(32).toString('base64url');
    const expiraEm = this.novaExpiracao();
    const registrado = await this.repo.registrarLinkPacienteSeAtivo(
      {
        atendimentoId,
        tokenHash: this.hash(token),
        participante: Participante.PACIENTE,
        tipo: TipoTokenSala.LINK_PACIENTE,
        usuarioId: null,
        expiraEm,
      },
      profissionalId,
    );
    if (!registrado) {
      this.salaIndisponivel();
    }

    return {
      token,
      atendimentoId,
      expiraEm,
      // URL relativa: o frontend decide o domínio público sem o backend
      // precisar inferi-lo de cabeçalhos manipuláveis como Host.
      link: `/sala/${atendimentoId}?token=${token}`,
    };
  }

  async entrarComoPaciente(tokenOpaco: string, dto: EntrarSalaPacienteDto) {
    const agora = new Date();
    const tokenHash = this.hash(tokenOpaco);
    const contexto = await this.repo.buscarContextoDoLink(
      tokenHash,
      dto.atendimentoId,
      agora,
    );
    if (!contexto) {
      this.linkInvalido();
    }

    const ttlRestante = Math.max(
      1,
      Math.min(
        this.ttlSegundos,
        Math.floor((contexto.expiraEm.getTime() - agora.getTime()) / 1_000),
      ),
    );
    const token = await this.livekit.emitirToken({
      atendimentoId: dto.atendimentoId,
      identidade: this.livekit.identidadeDoPaciente(dto.atendimentoId),
      nome: contexto.atendimento.paciente.nome,
      participante: Participante.PACIENTE,
      ttlSegundos: ttlRestante,
    });
    const expiraEm = new Date(agora.getTime() + ttlRestante * 1_000);
    const consumido = await this.repo.consumirLinkERegistrarAcesso(
      tokenHash,
      {
        atendimentoId: dto.atendimentoId,
        tokenHash: this.hash(token),
        participante: Participante.PACIENTE,
        tipo: TipoTokenSala.ACESSO_LIVEKIT,
        usuarioId: null,
        expiraEm,
      },
      agora,
    );
    if (!consumido) {
      this.linkInvalido();
    }

    return this.respostaDeAcesso(
      token,
      dto.atendimentoId,
      Participante.PACIENTE,
      expiraEm,
    );
  }

  async renovarTokenPaciente(atendimentoId: string, tokenAtual: string) {
    const agora = new Date();
    const tokenHashAtual = this.hash(tokenAtual);
    const contexto = await this.repo.buscarContextoDoAcessoPaciente(
      tokenHashAtual,
      atendimentoId,
      agora,
    );
    if (!contexto) {
      this.acessoPacienteInvalido();
    }

    const novoToken = await this.livekit.emitirToken({
      atendimentoId,
      identidade: this.livekit.identidadeDoPaciente(atendimentoId),
      nome: contexto.atendimento.paciente.nome,
      participante: Participante.PACIENTE,
      ttlSegundos: this.ttlSegundos,
    });
    const expiraEm = this.novaExpiracao();
    const renovado = await this.repo.renovarAcessoPaciente(
      tokenHashAtual,
      {
        atendimentoId,
        tokenHash: this.hash(novoToken),
        participante: Participante.PACIENTE,
        tipo: TipoTokenSala.ACESSO_LIVEKIT,
        usuarioId: null,
        expiraEm,
      },
      agora,
    );
    if (!renovado) {
      this.acessoPacienteInvalido();
    }

    return this.respostaDeAcesso(
      novoToken,
      atendimentoId,
      Participante.PACIENTE,
      expiraEm,
    );
  }

  async encerrar(atendimentoId: string): Promise<void> {
    const profissionalId =
      await this.repo.profissionalDoAtendimento(atendimentoId);
    const totalDeTentativas = this.atrasosDeEncerramentoMs.length + 1;

    for (let tentativa = 1; tentativa <= totalDeTentativas; tentativa += 1) {
      try {
        await this.livekit.encerrarSala(atendimentoId, profissionalId);
        return;
      } catch (erro) {
        if (tentativa === totalDeTentativas) {
          // O banco já revogou as credenciais na transação que finalizou o
          // atendimento. A falha do provedor não pode desfazer o estado
          // clínico, mas fica explícita depois das retentativas curtas.
          this.logger.error(
            `Falha ao encerrar sala do atendimento ${atendimentoId} após ${totalDeTentativas} tentativas`,
            erro instanceof Error ? erro.stack : String(erro),
          );
          return;
        }

        const atraso = this.atrasosDeEncerramentoMs[tentativa - 1] ?? 0;
        this.logger.warn(
          `LiveKit indisponível ao encerrar ${atendimentoId}; nova tentativa em ${atraso}ms`,
        );
        await this.aguardar(atraso);
      }
    }
  }

  private async criarAcessoProfissional(
    atendimentoId: string,
    usuario: UsuarioAutenticado,
  ) {
    const token = await this.livekit.emitirToken({
      atendimentoId,
      identidade: this.livekit.identidadeDoProfissional(usuario.id),
      nome: usuario.nome,
      participante: Participante.PROFISSIONAL,
      ttlSegundos: this.ttlSegundos,
    });
    const expiraEm = this.novaExpiracao();
    const registrado = await this.repo.registrarAcessoProfissionalSeAtivo({
      atendimentoId,
      tokenHash: this.hash(token),
      participante: Participante.PROFISSIONAL,
      tipo: TipoTokenSala.ACESSO_LIVEKIT,
      usuarioId: usuario.id,
      expiraEm,
    });
    if (!registrado) {
      this.salaIndisponivel();
    }

    return this.respostaDeAcesso(
      token,
      atendimentoId,
      Participante.PROFISSIONAL,
      expiraEm,
    );
  }

  private respostaDeAcesso(
    token: string,
    atendimentoId: string,
    participante: Participante,
    expiraEm: Date,
  ) {
    return {
      token,
      url: this.livekit.url,
      sala: this.livekit.nomeDaSala(atendimentoId),
      atendimentoId,
      participante,
      expiraEm,
    };
  }

  private novaExpiracao(): Date {
    return new Date(Date.now() + this.ttlSegundos * 1_000);
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private aguardar(milisegundos: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milisegundos));
  }

  private salaIndisponivel(): never {
    throw new TransicaoInvalida(
      'A sala só pode ser acessada durante um atendimento em andamento',
    );
  }

  private linkInvalido(): never {
    // A mesma resposta cobre token errado, expirado, revogado, reutilizado e
    // pertencente a outro atendimento. Diferenciar os casos criaria oráculo.
    throw new AcessoNegado('Link de acesso inválido ou expirado');
  }

  private acessoPacienteInvalido(): never {
    // Token errado, expirado, revogado, já renovado e atendimento encerrado
    // produzem a mesma resposta para não revelar o estado da sala.
    throw new AcessoNegado('Acesso da sala inválido ou expirado');
  }
}
