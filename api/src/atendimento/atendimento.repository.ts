import { Injectable } from '@nestjs/common';
import {
  Papel,
  Prisma,
  Risco,
  StatusAtendimento,
} from '../../generated/prisma/client';

/** Quantos atendimentos existem em cada combinação de status e risco. */
export type LinhaDistribuicaoFila = {
  status: StatusAtendimento;
  risco: Risco | null;
  total: number;
};
import type { UsuarioAutenticado } from '../common/auth/tipos';
import { PrismaService } from '../common/prisma/prisma.service';
import type { CadastrarPacienteDto } from './dto/cadastrar-paciente.schema';
import type { CriarAtendimentoDto } from './dto/criar-atendimento.schema';
import type { CriarTriagemDto } from './dto/criar-triagem.schema';
import type { ListarFilaDto } from './dto/listar-fila.schema';

// O repository isola o acesso ao Prisma. Ele existe sobretudo por causa do
// `assumirSeAindaEstiverNaFila` lá embaixo: é a consulta mais delicada do
// projeto e merece um lugar único, nomeado e óbvio.
@Injectable()
export class AtendimentoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listarFila(filtros: ListarFilaDto, usuario: UsuarioAutenticado) {
    const cpfBusca = filtros.busca?.replace(/\D/g, '');

    // Recorte de contexto: o que o profissional escolheu *olhar* (período e
    // busca). Fica separado do recorte de triagem (status e risco) porque o
    // resumo precisa do primeiro sem o segundo — ver comentário abaixo.
    const filtroContexto: Prisma.AtendimentoWhereInput = {
      ...this.filtroPeriodo(filtros.periodo),
      ...(filtros.busca
        ? {
            paciente: {
              OR: [
                {
                  // Sem `mode: insensitive`: isso é recurso do Postgres. No
                  // MySQL a collation utf8mb4_unicode_ci já ignora maiúsculas.
                  nome: {
                    contains: filtros.busca,
                  },
                },
                ...(cpfBusca ? [{ cpf: { contains: cpfBusca } }] : []),
              ],
            },
          }
        : {}),
    };
    const filtroTriagem: Prisma.AtendimentoWhereInput = {
      ...(filtros.status ? { status: { in: filtros.status } } : {}),
      ...(filtros.risco ? { risco: { in: filtros.risco } } : {}),
    };

    // A fila sem dono é compartilhada; depois que alguém assume, somente o
    // profissional vinculado continua vendo o item. Encaminhamentos criam uma
    // nova espera com encaminhadoDeId e são destinados apenas aos médicos.
    const aguardandoVisivel: Prisma.AtendimentoWhereInput = {
      status: StatusAtendimento.AGUARDANDO,
      ...(usuario.papel === Papel.ENFERMEIRO ? { encaminhadoDeId: null } : {}),
    };
    const escopoVisivel: Prisma.AtendimentoWhereInput = {
      OR: [aguardandoVisivel, { profissionalId: usuario.id }],
    };
    const where: Prisma.AtendimentoWhereInput = {
      AND: [filtroContexto, filtroTriagem, escopoVisivel],
    };
    // O resumo ignora status e risco de propósito. Ele é o painel que o
    // profissional usa para *aplicar* esses filtros; se respeitasse o filtro
    // ativo, clicar em "alta prioridade" zeraria todos os outros contadores e
    // o painel deixaria de servir para navegar.
    const whereResumo: Prisma.AtendimentoWhereInput = {
      AND: [filtroContexto, escopoVisivel],
    };

    // A ordenação espelha o índice [status, entradaFila]: filtra por status,
    // ordena por entrada. Quem chegou primeiro aparece primeiro — a fila não
    // é ordenada por risco de propósito, porque priorizar por gravidade é
    // decisão clínica do profissional, não do ORDER BY.
    const itemSelect = {
      id: true,
      status: true,
      risco: true,
      entradaFila: true,
      iniciadoEm: true,
      paciente: {
        select: { id: true, nome: true, cpf: true, contato: true },
      },
      profissional: { select: { id: true, nome: true } },
      encaminhadoDeId: true,
      encaminhadoPara: { select: { id: true } },
    } satisfies Prisma.AtendimentoSelect;

    // Uma tabulação cruzada em vez de N counts: o serviço deriva qualquer
    // combinação (aguardando, grave em aberto, etc.) sem ida extra ao banco, e
    // os números param de depender da página exibida. Fica fora do
    // `$transaction([...])` porque a tupla apaga a sobrecarga precisa do
    // groupBy e obrigaria a um cast; é um agregado de painel, não precisa do
    // mesmo snapshot da página.
    const [[itens, total, atendimentoAtivo], distribuicao] = await Promise.all([
      this.prisma.$transaction([
        this.prisma.atendimento.findMany({
          where,
          orderBy: { entradaFila: 'asc' },
          skip: (filtros.pagina - 1) * filtros.porPagina,
          take: filtros.porPagina,
          select: itemSelect,
        }),
        this.prisma.atendimento.count({ where }),
        // O vínculo ativo precisa aparecer mesmo quando a ficha entrou ontem e
        // a fila está filtrada em "hoje". Sem este destaque independente, o
        // profissional fica impedido pelo índice único sem enxergar o que deve
        // retomar e finalizar.
        this.prisma.atendimento.findFirst({
          where: {
            profissionalId: usuario.id,
            status: StatusAtendimento.EM_ANDAMENTO,
          },
          select: itemSelect,
        }),
      ]),
      this.prisma.atendimento.groupBy({
        by: ['status', 'risco'],
        where: whereResumo,
        orderBy: [{ status: 'asc' }],
        _count: true,
      }),
    ]);

    return {
      itens,
      total,
      atendimentoAtivo,
      distribuicao: distribuicao.map<LinhaDistribuicaoFila>((linha) => ({
        status: linha.status,
        risco: linha.risco,
        total: linha._count,
      })),
    };
  }

  async pacienteExiste(pacienteId: string): Promise<boolean> {
    const paciente = await this.prisma.paciente.findUnique({
      where: { id: pacienteId },
      select: { id: true },
    });
    return paciente !== null;
  }

  async pacienteExistePorCpf(cpf: string): Promise<boolean> {
    const paciente = await this.prisma.paciente.findUnique({
      where: { cpf },
      select: { id: true },
    });
    return paciente !== null;
  }

  async cadastrarPacienteComAtendimento(
    dto: CadastrarPacienteDto,
  ): Promise<string> {
    return this.prisma.$transaction(async (tx) => {
      const paciente = await tx.paciente.create({
        data: {
          nome: dto.nome,
          cpf: dto.cpf,
          contato: dto.contato,
          nascimento: dto.nascimento,
        },
        select: { id: true },
      });
      const atendimento = await tx.atendimento.create({
        data: {
          pacienteId: paciente.id,
          status: StatusAtendimento.AGUARDANDO,
        },
        select: { id: true },
      });
      return atendimento.id;
    });
  }

  async criar(dto: CriarAtendimentoDto): Promise<string> {
    const criado = await this.prisma.atendimento.create({
      data: { pacienteId: dto.pacienteId },
      select: { id: true },
    });
    return criado.id;
  }

  async prontuarioExiste(atendimentoId: string): Promise<boolean> {
    const prontuario = await this.prisma.prontuario.findUnique({
      where: { atendimentoId },
      select: { id: true },
    });
    return prontuario !== null;
  }

  async contextoParaInicio(id: string) {
    return this.prisma.atendimento.findUnique({
      where: { id },
      select: { status: true, encaminhadoDeId: true },
    });
  }

  /**
   * Assume o atendimento — a operação central do domínio e a única em que
   * dois profissionais disputam o mesmo recurso.
   *
   * A condição `status: AGUARDANDO` está **dentro do `where` do UPDATE**, e
   * não num `if` antes dele. Essa é a diferença entre correto e quase certo:
   *
   *   SQL gerado, em essência:
   *     UPDATE Atendimento
   *        SET status='EM_ANDAMENTO', profissionalId=?, iniciadoEm=?
   *      WHERE id=? AND status='AGUARDANDO';
   *
   * Com duas requisições simultâneas sob READ COMMITTED, a primeira pega o
   * bloqueio da linha e comita. A segunda fica esperando nesse mesmo
   * bloqueio; quando ele é liberado, o InnoDB **reavalia o predicado contra
   * a versão nova** da linha, encontra status='EM_ANDAMENTO' e não atualiza
   * nada. `count` volta 0 e o service transforma isso em 409.
   *
   * Uma ida ao banco, sem laço de repetição, sem transação explícita.
   *
   * Alternativas consideradas e por que não:
   *   - SELECT ... FOR UPDATE: duas idas ao banco e serializa a fila inteira.
   *   - Coluna de versão (optimistic locking): redundante — o próprio status
   *     já é a versão, e ele muda em toda transição.
   *   - SERIALIZABLE: obriga tratar 40001 e repetir a operação no cliente,
   *     complexidade sem ganho para um predicado simples como este.
   *
   * O `updateMany` (e não `update`) é proposital: `update` exige que o
   * registro exista e lança quando o `where` não casa, enquanto `updateMany`
   * devolve `count: 0` — que é exatamente o sinal que se quer aqui.
   */
  async assumirSeAindaEstiverNaFila(
    id: string,
    profissionalId: string,
  ): Promise<number> {
    const { count } = await this.prisma.atendimento.updateMany({
      where: { id, status: StatusAtendimento.AGUARDANDO },
      data: {
        status: StatusAtendimento.EM_ANDAMENTO,
        profissionalId,
        iniciadoEm: new Date(),
      },
    });

    return count;
  }

  async finalizarSeEmAndamento(
    id: string,
    profissionalId: string,
  ): Promise<number> {
    const agora = new Date();
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.atendimento.updateMany({
        where: {
          id,
          profissionalId,
          status: StatusAtendimento.EM_ANDAMENTO,
        },
        data: {
          status: StatusAtendimento.FINALIZADO,
          finalizadoEm: agora,
        },
      });
      if (count === 0) {
        return 0;
      }

      // Marcar o prontuário e revogar os tokens pertencem à mesma mudança de
      // estado. Se uma das escritas falhar, nenhuma delas pode ficar pela metade.
      await tx.prontuario.updateMany({
        where: { atendimentoId: id, finalizadoEm: null },
        data: { finalizadoEm: agora },
      });
      await tx.salaToken.updateMany({
        where: { atendimentoId: id, revogadoEm: null },
        data: { revogadoEm: agora },
      });

      return count;
    });
  }

  async cancelarSeAguardando(id: string): Promise<number> {
    const { count } = await this.prisma.atendimento.updateMany({
      where: { id, status: StatusAtendimento.AGUARDANDO },
      data: {
        status: StatusAtendimento.CANCELADO,
        canceladoEm: new Date(),
      },
    });
    return count;
  }

  async encaminharSeEmAndamento(
    id: string,
    profissionalId: string,
  ): Promise<string | null> {
    const agora = new Date();
    return this.prisma.$transaction(async (tx) => {
      const origem = await tx.atendimento.findUnique({
        where: { id },
        select: { pacienteId: true, risco: true },
      });
      if (!origem) {
        return null;
      }

      const { count } = await tx.atendimento.updateMany({
        where: {
          id,
          profissionalId,
          status: StatusAtendimento.EM_ANDAMENTO,
        },
        data: {
          status: StatusAtendimento.FINALIZADO,
          finalizadoEm: agora,
        },
      });
      if (count === 0) {
        return null;
      }

      await tx.prontuario.updateMany({
        where: { atendimentoId: id, finalizadoEm: null },
        data: { finalizadoEm: agora },
      });
      await tx.salaToken.updateMany({
        where: { atendimentoId: id, revogadoEm: null },
        data: { revogadoEm: agora },
      });

      // Encaminhar cria outro atendimento em vez de trocar o profissional do
      // atual. Assim o histórico da etapa de enfermagem permanece íntegro.
      const encaminhado = await tx.atendimento.create({
        data: {
          pacienteId: origem.pacienteId,
          risco: origem.risco,
          encaminhadoDeId: id,
        },
        select: { id: true },
      });
      return encaminhado.id;
    });
  }

  /**
   * Encaminha um atendimento já FINALIZADO. Não mexe no status de origem —
   * FINALIZADO é terminal. Só nasce a ficha médica, e o índice único em
   * `encaminhadoDeId` impede o segundo encaminhamento.
   */
  async encaminharSeFinalizado(
    id: string,
    profissionalId: string,
  ): Promise<string | null> {
    return this.prisma.$transaction(async (tx) => {
      const origem = await tx.atendimento.findUnique({
        where: { id },
        select: {
          pacienteId: true,
          risco: true,
          status: true,
          profissionalId: true,
          encaminhadoDeId: true,
          triagem: { select: { id: true } },
          encaminhadoPara: { select: { id: true } },
        },
      });
      if (
        !origem ||
        origem.profissionalId !== profissionalId ||
        origem.status !== StatusAtendimento.FINALIZADO ||
        origem.encaminhadoDeId ||
        !origem.triagem ||
        origem.encaminhadoPara
      ) {
        return null;
      }

      try {
        const encaminhado = await tx.atendimento.create({
          data: {
            pacienteId: origem.pacienteId,
            risco: origem.risco,
            encaminhadoDeId: id,
          },
          select: { id: true },
        });
        return encaminhado.id;
      } catch (erro) {
        // O índice único em encaminhadoDeId é quem decide a corrida: a
        // segunda requisição encontra a linha já criada e perde.
        if (
          erro instanceof Prisma.PrismaClientKnownRequestError &&
          erro.code === 'P2002'
        ) {
          return null;
        }
        throw erro;
      }
    });
  }

  async criarTriagem(
    atendimentoId: string,
    autorId: string,
    dto: CriarTriagemDto,
  ): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.atendimento.updateMany({
        where: {
          id: atendimentoId,
          profissionalId: autorId,
          status: StatusAtendimento.EM_ANDAMENTO,
        },
        data: { risco: dto.risco },
      });
      if (count === 0) {
        return 0;
      }

      await tx.triagem.create({
        data: {
          atendimentoId,
          autorId,
          queixa: dto.queixa,
          pa: dto.pa,
          fc: dto.fc,
          temperatura: dto.temperatura,
          satO2: dto.satO2,
        },
      });
      return count;
    });
  }

  async statusAtual(id: string): Promise<StatusAtendimento | null> {
    const atendimento = await this.prisma.atendimento.findUnique({
      where: { id },
      select: { status: true },
    });

    return atendimento?.status ?? null;
  }

  async buscarPorId(id: string) {
    return this.prisma.atendimento.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        risco: true,
        entradaFila: true,
        iniciadoEm: true,
        finalizadoEm: true,
        canceladoEm: true,
        paciente: {
          select: {
            id: true,
            nome: true,
            cpf: true,
            contato: true,
            nascimento: true,
          },
        },
        profissional: { select: { id: true, nome: true, papel: true } },
        triagem: {
          select: {
            queixa: true,
            pa: true,
            fc: true,
            temperatura: true,
            satO2: true,
            criadoEm: true,
          },
        },
        encaminhadoDeId: true,
        encaminhadoDe: {
          select: {
            id: true,
            profissional: { select: { id: true, nome: true } },
            triagem: {
              select: {
                queixa: true,
                pa: true,
                fc: true,
                temperatura: true,
                satO2: true,
                criadoEm: true,
              },
            },
          },
        },
        encaminhadoPara: { select: { id: true } },
      },
    });
  }

  private filtroPeriodo(
    periodo: ListarFilaDto['periodo'],
  ): Prisma.AtendimentoWhereInput {
    if (periodo === 'todos') {
      return {};
    }

    const inicioHoje = new Date();
    inicioHoje.setHours(0, 0, 0, 0);

    if (periodo === 'hoje') {
      return { entradaFila: { gte: inicioHoje } };
    }

    if (periodo === 'ontem') {
      const inicioOntem = new Date(inicioHoje);
      inicioOntem.setDate(inicioOntem.getDate() - 1);
      return { entradaFila: { gte: inicioOntem, lt: inicioHoje } };
    }

    const inicioSemana = new Date(inicioHoje);
    inicioSemana.setDate(inicioSemana.getDate() - 7);
    return { entradaFila: { gte: inicioSemana } };
  }
}
