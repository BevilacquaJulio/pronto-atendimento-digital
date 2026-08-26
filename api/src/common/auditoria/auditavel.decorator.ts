import { SetMetadata } from '@nestjs/common';

export const CHAVE_AUDITAVEL = 'rota_auditavel';

export type RecursoAuditavel = 'atendimento' | 'prontuario' | 'paciente';

export interface ConfiguracaoAuditavel {
  acao: string;
  recurso: RecursoAuditavel;
  /** Parâmetro da rota que identifica o recurso. */
  param?: string;
  /** Campo do corpo usado quando o identificador não faz parte da rota. */
  bodyField?: string;
}

/** Marca uma rota clínica cujo acesso, permitido ou negado, deixa rastro. */
export const Auditavel = (config: ConfiguracaoAuditavel) =>
  SetMetadata(CHAVE_AUDITAVEL, config);
