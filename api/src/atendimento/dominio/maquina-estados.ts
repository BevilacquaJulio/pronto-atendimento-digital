import { StatusAtendimento } from '../../../generated/prisma/client';

/**
 * Máquina de estados do atendimento.
 *
 * Função pura, sem Prisma e sem Nest: é o único pedaço da regra de negócio
 * que dá para testar exaustivamente em milissegundos. Os 16 pares possíveis
 * de (origem, destino) cabem num teste unitário; se isso morasse dentro do
 * service, testar os 16 exigiria banco.
 *
 * Esta é a **primeira** barreira, não a única. O `updateMany` condicional no
 * repositório repete a checagem dentro do próprio `WHERE`, porque entre este
 * `if` e o `UPDATE` existe uma janela em que outra requisição pode ter mudado
 * o status. Validar aqui devolve mensagem boa; validar lá garante correção.
 */

const TRANSICOES: Record<StatusAtendimento, StatusAtendimento[]> = {
  [StatusAtendimento.AGUARDANDO]: [
    StatusAtendimento.EM_ANDAMENTO,
    StatusAtendimento.CANCELADO,
  ],
  [StatusAtendimento.EM_ANDAMENTO]: [StatusAtendimento.FINALIZADO],
  // Estados terminais. Corrigir um atendimento finalizado não é voltar o
  // status: é adendo no prontuário, que preserva o registro original.
  [StatusAtendimento.FINALIZADO]: [],
  [StatusAtendimento.CANCELADO]: [],
};

export function transicaoPermitida(
  de: StatusAtendimento,
  para: StatusAtendimento,
): boolean {
  return TRANSICOES[de].includes(para);
}

export function destinosValidos(
  de: StatusAtendimento,
): readonly StatusAtendimento[] {
  return TRANSICOES[de];
}

export function ehTerminal(status: StatusAtendimento): boolean {
  return TRANSICOES[status].length === 0;
}

/** Texto de erro que diz ao cliente o que era possível a partir dali. */
export function explicarTransicao(
  de: StatusAtendimento,
  para: StatusAtendimento,
): string {
  const validos = TRANSICOES[de];

  if (validos.length === 0) {
    return `Atendimento ${de} é um estado final e não aceita mais transições`;
  }

  return `Não é possível ir de ${de} para ${para}. A partir de ${de}: ${validos.join(', ')}`;
}
