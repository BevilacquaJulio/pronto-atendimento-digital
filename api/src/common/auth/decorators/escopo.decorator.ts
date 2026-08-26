import { SetMetadata } from '@nestjs/common';
import { TipoDeRecurso } from '../tipos';

export const CHAVE_ESCOPO = 'escopo_do_recurso';

export interface ConfiguracaoDeEscopo {
  tipo: TipoDeRecurso;
  /** Nome do parâmetro de rota que carrega o id do recurso. */
  param: string;
  /**
   * Se `true`, atendimento ainda sem profissional (AGUARDANDO) é acessível a
   * qualquer papel clínico — é o caso da fila, onde ninguém está vinculado
   * ainda e todos precisam enxergar para poder assumir.
   *
   * Se `false`, exige vínculo sempre. É o que rotas de prontuário usam.
   */
  permitirSemVinculo?: boolean;
}

/**
 * Marca que a rota opera sobre um recurso de terceiro e exige verificação de
 * vínculo, não só de papel.
 *
 * Esta é a defesa contra IDOR: autenticar como médico legítimo e trocar o
 * :id da URL pelo atendimento de outro profissional.
 */
export const Escopo = (config: ConfiguracaoDeEscopo) =>
  SetMetadata(CHAVE_ESCOPO, config);
