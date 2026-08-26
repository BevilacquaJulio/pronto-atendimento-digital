import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { Papel, Participante } from '../../generated/prisma/client';
import type { UsuarioAutenticado } from '../common/auth/tipos';
import { LiveKitProvider } from './livekit.provider';
import { SalaRepository } from './sala.repository';
import { SalaService } from './sala.service';

const ATENDIMENTO = 'a0000000-0000-4000-8000-000000000001';
const USUARIO: UsuarioAutenticado = {
  id: 'b0000000-0000-4000-8000-000000000001',
  nome: 'Enfermeira Teste',
  email: 'enfermeira@teste.local',
  papel: Papel.ENFERMEIRO,
};

describe('SalaService', () => {
  let repo: jest.Mocked<SalaRepository>;
  let livekit: jest.Mocked<LiveKitProvider>;
  let service: SalaService;

  beforeEach(() => {
    repo = {
      registrarAcessoProfissionalSeAtivo: jest.fn(),
      registrarLinkPacienteSeAtivo: jest.fn(),
      buscarContextoDoLink: jest.fn(),
      consumirLinkERegistrarAcesso: jest.fn(),
      buscarContextoDoAcessoPaciente: jest.fn(),
      renovarAcessoPaciente: jest.fn(),
      profissionalDoAtendimento: jest.fn(),
    } as unknown as jest.Mocked<SalaRepository>;
    livekit = {
      url: 'ws://livekit.test',
      nomeDaSala: jest.fn((id: string) => `atendimento-${id}`),
      identidadeDoProfissional: jest.fn((id: string) => `profissional:${id}`),
      identidadeDoPaciente: jest.fn((id: string) => `paciente:${id}`),
      emitirToken: jest.fn().mockResolvedValue('jwt-livekit'),
      encerrarSala: jest.fn(),
    } as unknown as jest.Mocked<LiveKitProvider>;
    const config = {
      getOrThrow: jest.fn().mockReturnValue(900),
    } as unknown as ConfigService;
    service = new SalaService(repo, livekit, config);
  });

  it('emite acesso profissional e persiste somente o hash', async () => {
    repo.registrarAcessoProfissionalSeAtivo.mockResolvedValue(true);

    const resposta = await service.emitirTokenProfissional(
      ATENDIMENTO,
      USUARIO,
    );

    expect(resposta.token).toBe('jwt-livekit');
    expect(repo.registrarAcessoProfissionalSeAtivo.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        tokenHash: createHash('sha256').update('jwt-livekit').digest('hex'),
        participante: Participante.PROFISSIONAL,
      }),
    );
  });

  it('recusa emissão quando o atendimento não está ativo', async () => {
    repo.registrarAcessoProfissionalSeAtivo.mockResolvedValue(false);

    await expect(
      service.emitirTokenProfissional(ATENDIMENTO, USUARIO),
    ).rejects.toMatchObject({ status: 422 });
  });

  it('não consome link inválido ou pertencente a outro atendimento', async () => {
    repo.buscarContextoDoLink.mockResolvedValue(null);

    await expect(
      service.entrarComoPaciente('a'.repeat(43), {
        atendimentoId: ATENDIMENTO,
      }),
    ).rejects.toMatchObject({ status: 403 });
    expect(livekit.emitirToken.mock.calls).toHaveLength(0);
  });

  it('trata disputa pelo link como acesso negado', async () => {
    repo.buscarContextoDoLink.mockResolvedValue({
      expiraEm: new Date(Date.now() + 60_000),
      atendimento: { paciente: { id: 'p1', nome: 'Paciente' } },
    });
    repo.consumirLinkERegistrarAcesso.mockResolvedValue(false);

    await expect(
      service.entrarComoPaciente('a'.repeat(43), {
        atendimentoId: ATENDIMENTO,
      }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('renova o acesso atual do paciente e revoga a credencial anterior', async () => {
    repo.buscarContextoDoAcessoPaciente.mockResolvedValue({
      atendimento: { paciente: { nome: 'Paciente' } },
    });
    repo.renovarAcessoPaciente.mockResolvedValue(true);
    livekit.emitirToken.mockResolvedValue('jwt-livekit-renovado');

    const resposta = await service.renovarTokenPaciente(
      ATENDIMENTO,
      'jwt-livekit-atual',
    );

    expect(resposta.token).toBe('jwt-livekit-renovado');
    expect(livekit.emitirToken.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        atendimentoId: ATENDIMENTO,
        participante: Participante.PACIENTE,
        ttlSegundos: 900,
      }),
    );
    expect(repo.renovarAcessoPaciente.mock.calls[0]).toEqual([
      createHash('sha256').update('jwt-livekit-atual').digest('hex'),
      expect.objectContaining({
        tokenHash: createHash('sha256')
          .update('jwt-livekit-renovado')
          .digest('hex'),
        participante: Participante.PACIENTE,
      }),
      expect.any(Date),
    ]);
  });

  it('recusa renovação com acesso expirado sem emitir novo token', async () => {
    repo.buscarContextoDoAcessoPaciente.mockResolvedValue(null);

    await expect(
      service.renovarTokenPaciente(ATENDIMENTO, 'jwt-livekit-expirado'),
    ).rejects.toMatchObject({ status: 403 });
    expect(livekit.emitirToken.mock.calls).toHaveLength(0);
  });

  it('refaz o DeleteRoom quando a primeira tentativa falha', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    repo.profissionalDoAtendimento.mockResolvedValue(USUARIO.id);
    livekit.encerrarSala
      .mockRejectedValueOnce(new Error('fetch failed'))
      .mockResolvedValueOnce();

    await expect(service.encerrar(ATENDIMENTO)).resolves.toBeUndefined();
    expect(livekit.encerrarSala.mock.calls).toHaveLength(2);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('nova tentativa em 100ms'),
    );
    warn.mockRestore();
  });

  it('não desfaz a finalização depois de esgotar as retentativas', async () => {
    const log = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    repo.profissionalDoAtendimento.mockResolvedValue(USUARIO.id);
    livekit.encerrarSala.mockRejectedValue(new Error('LiveKit offline'));

    await expect(service.encerrar(ATENDIMENTO)).resolves.toBeUndefined();
    expect(livekit.encerrarSala.mock.calls).toHaveLength(3);
    expect(log).toHaveBeenCalled();
    warn.mockRestore();
    log.mockRestore();
  });
});
