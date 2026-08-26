import { Injectable, Logger } from '@nestjs/common';
import {
  Papel,
  Prisma,
  Risco,
  StatusAtendimento,
} from '../../generated/prisma/client';
import {
  AcessoNegado,
  ConflitoDeEstado,
  RecursoNaoEncontrado,
  TransicaoInvalida,
} from '../common/erros/erros';
import {
  AtendimentoRepository,
  type LinhaDistribuicaoFila,
} from './atendimento.repository';
import {
  explicarTransicao,
  transicaoPermitida,
} from './dominio/maquina-estados';
import type { UsuarioAutenticado } from '../common/auth/tipos';
import type { CadastrarPacienteDto } from './dto/cadastrar-paciente.schema';
import type { CriarAtendimentoDto } from './dto/criar-atendimento.schema';
import type { CriarTriagemDto } from './dto/criar-triagem.schema';
import type { ListarFilaDto } from './dto/listar-fila.schema';
import { SalaService } from '../sala/sala.service';

/** Violação de restrição única no MySQL, na numeração do Prisma. */
const P2002_UNICIDADE = 'P2002';

/** Tabulação cruzada status × risco devolvida pelo repository. */
type DistribuicaoFila = LinhaDistribuicaoFila[];

@Injectable()
export class AtendimentoService {
  private readonly logger = new Logger(AtendimentoService.name);

  constructor(
    private readonly repo: AtendimentoRepository,
    private readonly sala: SalaService,
  ) {}

  async listarFila(filtros: ListarFilaDto, usuario: UsuarioAutenticado) {
    const { itens, total, atendimentoAtivo, distribuicao } =
      await this.repo.listarFila(filtros, usuario);
    return {
      itens,
      total,
      atendimentoAtivo,
      resumo: this.resumirFila(distribuicao),
      pagina: filtros.pagina,
      porPagina: filtros.porPagina,
      paginas: Math.ceil(total / filtros.porPagina),
    };
  }

  /**
   * Traduz a tabulação cruzada (status × risco) do banco nos números que a
   * tela mostra. Fica aqui, e não no componente, porque "alta prioridade" é
   * uma definição clínica — vermelho ou laranja **ainda em aberto** — e não
   * uma soma qualquer que cada tela possa reinterpretar do seu jeito.
   */
  private resumirFila(distribuicao: DistribuicaoFila) {
    const somar = (
      predicado: (linha: DistribuicaoFila[number]) => boolean,
    ): number =>
      distribuicao.reduce(
        (acumulado, linha) =>
          predicado(linha) ? acumulado + linha.total : acumulado,
        0,
      );

    const emAberto = (linha: DistribuicaoFila[number]) =>
      linha.status === StatusAtendimento.AGUARDANDO ||
      linha.status === StatusAtendimento.EM_ANDAMENTO;
    const grave = (linha: DistribuicaoFila[number]) =>
      linha.risco === Risco.VERMELHO || linha.risco === Risco.LARANJA;

    return {
      totalPeriodo: somar(() => true),
      aguardando: somar(
        (linha) => linha.status === StatusAtendimento.AGUARDANDO,
      ),
      emAndamento: somar(
        (linha) => linha.status === StatusAtendimento.EM_ANDAMENTO,
      ),
      finalizados: somar(
        (linha) => linha.status === StatusAtendimento.FINALIZADO,
      ),
      cancelados: somar(
        (linha) => linha.status === StatusAtendimento.CANCELADO,
      ),
      altaPrioridade: somar((linha) => emAberto(linha) && grave(linha)),
      semTriagem: somar((linha) => emAberto(linha) && linha.risco === null),
    };
  }

  async criar(dto: CriarAtendimentoDto) {
    if (!(await this.repo.pacienteExiste(dto.pacienteId))) {
      throw new RecursoNaoEncontrado('Paciente');
    }
    const id = await this.repo.criar(dto);
    return this.detalhar(id);
  }

  async cadastrarPaciente(dto: CadastrarPacienteDto) {
    if (await this.repo.pacienteExistePorCpf(dto.cpf)) {
      throw new ConflitoDeEstado(
        'Já existe uma pessoa cadastrada com este CPF',
        'PACIENTE_JA_CADASTRADO',
      );
    }

    try {
      const id = await this.repo.cadastrarPacienteComAtendimento(dto);
      return this.detalhar(id);
    } catch (erro) {
      if (
        erro instanceof Prisma.PrismaClientKnownRequestError &&
        erro.code === P2002_UNICIDADE
      ) {
        throw new ConflitoDeEstado(
          'Já existe uma pessoa cadastrada com este CPF',
          'PACIENTE_JA_CADASTRADO',
        );
      }
      throw erro;
    }
  }

  async detalhar(id: string) {
    const atendimento = await this.repo.buscarPorId(id);

    // Aqui o 404 é seguro: o EscopoGuard já rodou antes e só deixa passar
    // quem tem vínculo, então não há como usar esta rota para descobrir
    // quais ids existem.
    if (!atendimento) {
      throw new RecursoNaoEncontrado('Atendimento');
    }

    return atendimento;
  }

  /**
   * Assume o atendimento.
   *
   * A leitura de status abaixo **não** é a proteção — é só o que permite
   * devolver um erro decente. A proteção de verdade está no `where` do
   * `updateMany` e na coluna gerada + unique do profissional ativo. Entre
   * esta leitura e a escrita existe uma janela de milissegundos em que outra
   * requisição pode assumir o mesmo atendimento; é justamente por isso que a
   * condição é repetida no banco.
   *
   * Três desfechos possíveis, e cada um vira um código diferente:
   *
   *   409 ATENDIMENTO_JA_ASSUMIDO   — alguém chegou primeiro
   *   409 JA_TEM_ATENDIMENTO_ATIVO  — quem chamou já está atendendo outro
   *   422 TRANSICAO_INVALIDA        — o atendimento está finalizado/cancelado
   *
   * Os dois primeiros compartilham o 409 porque ambos são conflito de estado,
   * mas o `codigo` no corpo os separa: a interface precisa dizer "esse
   * paciente já foi atendido por outro" ou "finalize o seu atual primeiro",
   * que são orientações completamente diferentes para o profissional.
   */
  async iniciar(id: string, usuario: UsuarioAutenticado) {
    const contexto = await this.repo.contextoParaInicio(id);
    const status = contexto?.status ?? null;

    if (status === null) {
      // 404 aqui não vaza nada: a fila inteira já é visível para os papéis
      // clínicos, então saber que um id existe não é informação nova.
      throw new RecursoNaoEncontrado('Atendimento');
    }

    if (usuario.papel === Papel.ENFERMEIRO && contexto?.encaminhadoDeId) {
      throw new AcessoNegado(
        'Atendimentos encaminhados são destinados ao papel médico',
      );
    }

    if (status !== StatusAtendimento.AGUARDANDO) {
      // Já em andamento é conflito (alguém chegou antes), não transição
      // absurda. Finalizado ou cancelado é transição absurda, e a máquina de
      // estados é quem diz isso.
      if (status === StatusAtendimento.EM_ANDAMENTO) {
        throw new ConflitoDeEstado(
          'Este atendimento já foi assumido por outro profissional',
          'ATENDIMENTO_JA_ASSUMIDO',
        );
      }

      if (!transicaoPermitida(status, StatusAtendimento.EM_ANDAMENTO)) {
        throw new TransicaoInvalida(
          explicarTransicao(status, StatusAtendimento.EM_ANDAMENTO),
        );
      }
    }

    let atualizados: number;
    try {
      atualizados = await this.repo.assumirSeAindaEstiverNaFila(id, usuario.id);
    } catch (erro) {
      if (
        erro instanceof Prisma.PrismaClientKnownRequestError &&
        erro.code === P2002_UNICIDADE
      ) {
        // Unique uniq_profissional_atendimento_ativo (coluna gerada). O
        // profissional já tem um atendimento EM_ANDAMENTO — regra garantida
        // pelo banco, não por uma consulta prévia que teria a mesma janela
        // de corrida que o resto. Traduzir a violação é papel da aplicação;
        // impedi-la é papel do índice.
        throw new ConflitoDeEstado(
          'Você já tem um atendimento em andamento. Finalize-o antes de assumir outro',
          'JA_TEM_ATENDIMENTO_ATIVO',
        );
      }
      throw erro;
    }

    if (atualizados === 0) {
      // Perdeu a corrida entre a leitura de status e o UPDATE. O predicado
      // dentro do WHERE reavaliou contra a linha já alterada e não casou.
      this.logger.log(
        `Corrida perdida ao assumir o atendimento ${id} (profissional ${usuario.id})`,
      );
      throw new ConflitoDeEstado(
        'Este atendimento já foi assumido por outro profissional',
        'ATENDIMENTO_JA_ASSUMIDO',
      );
    }

    return this.detalhar(id);
  }

  async finalizar(id: string, usuario: UsuarioAutenticado) {
    const status = await this.exigirStatus(id);
    if (!transicaoPermitida(status, StatusAtendimento.FINALIZADO)) {
      throw new TransicaoInvalida(
        explicarTransicao(status, StatusAtendimento.FINALIZADO),
      );
    }
    if (
      usuario.papel === Papel.MEDICO &&
      !(await this.repo.prontuarioExiste(id))
    ) {
      throw new TransicaoInvalida(
        'O atendimento médico precisa de prontuário antes da finalização',
      );
    }

    const atualizados = await this.repo.finalizarSeEmAndamento(id, usuario.id);
    if (atualizados === 0) {
      throw new ConflitoDeEstado(
        'O atendimento mudou enquanto estava sendo finalizado',
        'ATENDIMENTO_ALTERADO',
      );
    }
    await this.sala.encerrar(id);
    return this.detalhar(id);
  }

  async cancelar(id: string) {
    const status = await this.exigirStatus(id);
    if (!transicaoPermitida(status, StatusAtendimento.CANCELADO)) {
      throw new TransicaoInvalida(
        explicarTransicao(status, StatusAtendimento.CANCELADO),
      );
    }

    const atualizados = await this.repo.cancelarSeAguardando(id);
    if (atualizados === 0) {
      throw new ConflitoDeEstado(
        'Outro profissional assumiu o atendimento antes do cancelamento',
        'ATENDIMENTO_JA_ASSUMIDO',
      );
    }
    return this.detalhar(id);
  }

  /**
   * Encerra a etapa de enfermagem e abre uma ficha nova para o médico.
   *
   * Aceita `EM_ANDAMENTO` (fluxo da sala) e `FINALIZADO` com triagem e sem
   * encaminhamento prévio — a enfermagem pode ter encerrado a videochamada
   * sem mandar ao médico e ainda assim precisa da ficha médica. Isso não
   * viola o grafo: `FINALIZADO` continua terminal; o que nasce é outro
   * atendimento em `AGUARDANDO`.
   *
   * @throws TransicaoInvalida quando falta triagem ou o status não admite
   * @throws ConflitoDeEstado quando já foi encaminhado ou o estado mudou (409)
   */
  async encaminhar(id: string, profissionalId: string) {
    const origem = await this.repo.buscarPorId(id);
    if (!origem) {
      throw new RecursoNaoEncontrado('Atendimento');
    }

    if (!origem.triagem) {
      throw new TransicaoInvalida(
        'O encaminhamento ao médico exige triagem registrada',
      );
    }
    if (origem.encaminhadoDeId) {
      throw new TransicaoInvalida(
        'Este atendimento já é a etapa médica e não pode ser encaminhado de novo',
      );
    }
    if (origem.encaminhadoPara) {
      throw new ConflitoDeEstado(
        'Este atendimento já foi encaminhado ao médico',
        'ATENDIMENTO_JA_ENCAMINHADO',
      );
    }

    const emAndamento = origem.status === StatusAtendimento.EM_ANDAMENTO;
    const finalizado = origem.status === StatusAtendimento.FINALIZADO;
    if (!emAndamento && !finalizado) {
      throw new TransicaoInvalida(
        'Só é possível encaminhar um atendimento em andamento ou já finalizado com triagem',
      );
    }

    const novoId = emAndamento
      ? await this.repo.encaminharSeEmAndamento(id, profissionalId)
      : await this.repo.encaminharSeFinalizado(id, profissionalId);
    if (!novoId) {
      throw new ConflitoDeEstado(
        'O atendimento mudou enquanto estava sendo encaminhado',
        'ATENDIMENTO_ALTERADO',
      );
    }

    // Sala já foi encerrada na finalização. Chamar de novo no caminho
    // EM_ANDAMENTO desconecta quem ainda está na chamada; no FINALIZADO o
    // DeleteRoom é idempotente.
    if (emAndamento) {
      await this.sala.encerrar(id);
    }
    return this.detalhar(novoId);
  }

  async criarTriagem(id: string, autorId: string, dto: CriarTriagemDto) {
    const status = await this.exigirStatus(id);
    if (status !== StatusAtendimento.EM_ANDAMENTO) {
      throw new TransicaoInvalida(
        'A triagem só pode ser registrada durante um atendimento em andamento',
      );
    }

    try {
      const atualizados = await this.repo.criarTriagem(id, autorId, dto);
      if (atualizados === 0) {
        throw new ConflitoDeEstado(
          'O atendimento mudou antes do registro da triagem',
          'ATENDIMENTO_ALTERADO',
        );
      }
    } catch (erro) {
      if (
        erro instanceof Prisma.PrismaClientKnownRequestError &&
        erro.code === P2002_UNICIDADE
      ) {
        throw new ConflitoDeEstado(
          'Este atendimento já possui triagem',
          'TRIAGEM_JA_REGISTRADA',
        );
      }
      throw erro;
    }

    return this.detalhar(id);
  }

  private async exigirStatus(id: string): Promise<StatusAtendimento> {
    const status = await this.repo.statusAtual(id);
    if (status === null) {
      throw new RecursoNaoEncontrado('Atendimento');
    }
    return status;
  }
}
