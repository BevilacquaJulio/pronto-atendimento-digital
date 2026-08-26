import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { Participante } from '../../generated/prisma/client';

export interface EmitirTokenVideo {
  atendimentoId: string;
  identidade: string;
  nome: string;
  participante: Participante;
  ttlSegundos: number;
}

@Injectable()
export class LiveKitProvider {
  private readonly logger = new Logger(LiveKitProvider.name);
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly urlCliente: string;
  private readonly salas: RoomServiceClient;

  constructor(config: ConfigService) {
    const url = config.getOrThrow<string>('LIVEKIT_URL');
    const urlPublica = config.get<string>('LIVEKIT_PUBLIC_URL') ?? url;
    this.apiKey = config.getOrThrow<string>('LIVEKIT_API_KEY');
    this.apiSecret = config.getOrThrow<string>('LIVEKIT_API_SECRET');
    this.urlCliente = this.normalizarUrlCliente(urlPublica);
    this.salas = new RoomServiceClient(
      this.normalizarUrlHttp(url),
      this.apiKey,
      this.apiSecret,
      { requestTimeout: 2 },
    );
  }

  get url(): string {
    return this.urlCliente;
  }

  nomeDaSala(atendimentoId: string): string {
    return `atendimento-${atendimentoId}`;
  }

  identidadeDoProfissional(usuarioId: string): string {
    return `profissional:${usuarioId}`;
  }

  identidadeDoPaciente(atendimentoId: string): string {
    return `paciente:${atendimentoId}`;
  }

  async emitirToken(dados: EmitirTokenVideo): Promise<string> {
    const token = new AccessToken(this.apiKey, this.apiSecret, {
      identity: dados.identidade,
      name: dados.nome,
      ttl: dados.ttlSegundos,
      attributes: {
        atendimentoId: dados.atendimentoId,
        participante: dados.participante,
        // O SDK não inclui jti automaticamente. A sessão impede que duas
        // emissões no mesmo segundo produzam JWTs idênticos.
        sessao: randomUUID(),
      },
    });
    token.addGrant({
      roomJoin: true,
      room: this.nomeDaSala(dados.atendimentoId),
      canPublish: true,
      canSubscribe: true,
      // O chat textual usa os pacotes de dados confiáveis do LiveKit.
      canPublishData: true,
      canUpdateOwnMetadata: false,
    });
    return token.toJwt();
  }

  async encerrarSala(
    atendimentoId: string,
    profissionalId: string | null,
  ): Promise<void> {
    const sala = this.nomeDaSala(atendimentoId);
    const existentes = await this.salas.listRooms([sala]);
    if (existentes.length === 0) {
      return;
    }

    const corte = BigInt(Math.floor(Date.now() / 1_000));
    const identidades = [this.identidadeDoPaciente(atendimentoId)];
    if (profissionalId) {
      identidades.push(this.identidadeDoProfissional(profissionalId));
    }

    const remocoes = await Promise.allSettled(
      identidades.map((identidade) =>
        this.salas.removeParticipant(sala, identidade, {
          revokeTokenTs: corte,
        }),
      ),
    );
    for (const remocao of remocoes) {
      if (remocao.status === 'rejected') {
        this.logger.warn(
          `Não foi possível remover um participante da sala ${sala}: ${String(remocao.reason)}`,
        );
      }
    }

    // DeleteRoom desconecta qualquer identidade que não estava na lista e
    // impede que uma sala clínica permaneça aberta depois da finalização.
    await this.salas.deleteRoom(sala);
  }

  private normalizarUrlHttp(url: string): string {
    if (url.startsWith('wss://')) return `https://${url.slice(6)}`;
    if (url.startsWith('ws://')) return `http://${url.slice(5)}`;
    return url;
  }

  private normalizarUrlCliente(url: string): string {
    if (url.startsWith('https://')) return `wss://${url.slice(8)}`;
    if (url.startsWith('http://')) return `ws://${url.slice(7)}`;
    return url;
  }
}
