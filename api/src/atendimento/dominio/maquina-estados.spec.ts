import { StatusAtendimento } from '../../../generated/prisma/client';
import {
  destinosValidos,
  ehTerminal,
  explicarTransicao,
  transicaoPermitida,
} from './maquina-estados';

const TODOS = Object.values(StatusAtendimento);

// As únicas três transições que existem no sistema. Tudo o que não estiver
// nesta lista precisa ser recusado — inclusive um estado para ele mesmo.
const PERMITIDAS: [StatusAtendimento, StatusAtendimento][] = [
  [StatusAtendimento.AGUARDANDO, StatusAtendimento.EM_ANDAMENTO],
  [StatusAtendimento.AGUARDANDO, StatusAtendimento.CANCELADO],
  [StatusAtendimento.EM_ANDAMENTO, StatusAtendimento.FINALIZADO],
];

const ehPermitida = (de: StatusAtendimento, para: StatusAtendimento) =>
  PERMITIDAS.some(([o, d]) => o === de && d === para);

describe('máquina de estados do atendimento', () => {
  // 4 status × 4 status = 16 pares. Enumerar todos, em vez de escolher alguns,
  // é o que garante que nenhuma transição nova entre sem alguém decidir por
  // ela: acrescentar um destino no mapa quebra este teste na hora.
  const pares = TODOS.flatMap((de) => TODOS.map((para) => ({ de, para })));

  it.each(pares)('$de → $para', ({ de, para }) => {
    expect(transicaoPermitida(de, para)).toBe(ehPermitida(de, para));
  });

  it('cobre os 16 pares possíveis', () => {
    expect(pares).toHaveLength(16);
  });

  describe('estados terminais', () => {
    it('FINALIZADO não vai para lugar nenhum', () => {
      expect(ehTerminal(StatusAtendimento.FINALIZADO)).toBe(true);
      expect(destinosValidos(StatusAtendimento.FINALIZADO)).toHaveLength(0);
    });

    it('CANCELADO não vai para lugar nenhum', () => {
      expect(ehTerminal(StatusAtendimento.CANCELADO)).toBe(true);
      expect(destinosValidos(StatusAtendimento.CANCELADO)).toHaveLength(0);
    });

    it('AGUARDANDO e EM_ANDAMENTO não são terminais', () => {
      expect(ehTerminal(StatusAtendimento.AGUARDANDO)).toBe(false);
      expect(ehTerminal(StatusAtendimento.EM_ANDAMENTO)).toBe(false);
    });
  });

  describe('reabertura', () => {
    // Ninguém "desfinaliza" um atendimento. A correção do registro clínico é
    // por adendo no prontuário, que preserva o que foi escrito antes.
    it('FINALIZADO não volta para EM_ANDAMENTO', () => {
      expect(
        transicaoPermitida(
          StatusAtendimento.FINALIZADO,
          StatusAtendimento.EM_ANDAMENTO,
        ),
      ).toBe(false);
    });

    it('CANCELADO não volta para AGUARDANDO', () => {
      expect(
        transicaoPermitida(
          StatusAtendimento.CANCELADO,
          StatusAtendimento.AGUARDANDO,
        ),
      ).toBe(false);
    });

    it('EM_ANDAMENTO não pode ser cancelado', () => {
      expect(
        transicaoPermitida(
          StatusAtendimento.EM_ANDAMENTO,
          StatusAtendimento.CANCELADO,
        ),
      ).toBe(false);
    });
  });

  describe('mensagem de erro', () => {
    it('lista os destinos possíveis a partir da origem', () => {
      const texto = explicarTransicao(
        StatusAtendimento.AGUARDANDO,
        StatusAtendimento.FINALIZADO,
      );

      expect(texto).toContain('EM_ANDAMENTO');
      expect(texto).toContain('CANCELADO');
    });

    it('diz que o estado é final quando não há saída', () => {
      const texto = explicarTransicao(
        StatusAtendimento.FINALIZADO,
        StatusAtendimento.EM_ANDAMENTO,
      );

      expect(texto).toContain('estado final');
    });
  });
});
