import { ConfigService } from '@nestjs/config';
import { TokenVerifier } from 'livekit-server-sdk';
import { Participante } from '../../generated/prisma/client';
import { LiveKitProvider } from './livekit.provider';

const SEGREDO = 'segredo-livekit-com-tamanho-suficiente';

describe('LiveKitProvider', () => {
  const config = {
    get: jest.fn((chave: string) => {
      if (chave === 'LIVEKIT_PUBLIC_URL') {
        return 'https://video.pad.example';
      }
      return undefined;
    }),
    getOrThrow: jest.fn((chave: string) => {
      const valores: Record<string, string> = {
        LIVEKIT_URL: 'https://pad.livekit.example',
        LIVEKIT_API_KEY: 'chave-pad',
        LIVEKIT_API_SECRET: SEGREDO,
      };
      return valores[chave];
    }),
  } as unknown as ConfigService;

  it('assina token limitado à sala e habilita vídeo e chat', async () => {
    const provider = new LiveKitProvider(config);
    const token = await provider.emitirToken({
      atendimentoId: 'a0000000-0000-4000-8000-000000000001',
      identidade: 'profissional:u1',
      nome: 'Médica Teste',
      participante: Participante.PROFISSIONAL,
      ttlSegundos: 300,
    });
    const claims = await new TokenVerifier('chave-pad', SEGREDO).verify(token);

    expect(claims.sub).toBe('profissional:u1');
    expect(claims.video).toMatchObject({
      roomJoin: true,
      room: 'atendimento-a0000000-0000-4000-8000-000000000001',
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      canUpdateOwnMetadata: false,
    });
    expect((claims.exp ?? 0) - (claims.nbf ?? 0)).toBeLessThanOrEqual(300);
    expect(provider.url).toBe('wss://video.pad.example');
  });

  it('gera credenciais diferentes mesmo para a mesma pessoa e segundo', async () => {
    const provider = new LiveKitProvider(config);
    const dados = {
      atendimentoId: 'a0000000-0000-4000-8000-000000000001',
      identidade: 'profissional:u1',
      nome: 'Médica Teste',
      participante: Participante.PROFISSIONAL,
      ttlSegundos: 300,
    };

    const [primeiro, segundo] = await Promise.all([
      provider.emitirToken(dados),
      provider.emitirToken(dados),
    ]);

    expect(primeiro).not.toBe(segundo);
  });
});
