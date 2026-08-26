import { randomUUID } from 'node:crypto';
import type { EmitirTokenVideo } from '../src/sala/livekit.provider';

/**
 * Substitui somente a fronteira externa do LiveKit nos E2E.
 *
 * As regras de sala, tokens, revogação e auditoria continuam passando pela API
 * e pelo MySQL reais. A mídia não precisa estar disponível para que suítes
 * de atendimento e prontuário finalizem uma ficha sem acessar a rede.
 */
export class LiveKitFakeE2e {
  readonly url = 'ws://livekit.fake';
  readonly salasEncerradas: string[] = [];
  private sequencia = 0;

  nomeDaSala(atendimentoId: string) {
    return `atendimento-${atendimentoId}`;
  }

  identidadeDoProfissional(usuarioId: string) {
    return `profissional:${usuarioId}`;
  }

  identidadeDoPaciente(atendimentoId: string) {
    return `paciente:${atendimentoId}`;
  }

  emitirToken(dados: EmitirTokenVideo) {
    this.sequencia += 1;
    return Promise.resolve(
      `jwt-fake-${dados.participante}-${this.sequencia}-${randomUUID()}`,
    );
  }

  encerrarSala(atendimentoId: string) {
    this.salasEncerradas.push(atendimentoId);
    return Promise.resolve();
  }
}
