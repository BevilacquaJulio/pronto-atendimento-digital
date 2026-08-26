import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { Papel } from '../generated/prisma/client';
import { AppModule } from '../src/app.module';
import { FiltroDeExcecoes } from '../src/common/erros/filtro-excecoes';
import { PrismaService } from '../src/common/prisma/prisma.service';

/**
 * O teste que sustenta o invariante 1: um atendimento nunca tem dois
 * profissionais.
 *
 * Roda contra o MySQL de verdade porque é a única forma de exercitar o que
 * está sendo afirmado: que o predicado dentro do `WHERE` é reavaliado depois
 * do bloqueio de linha. Com Prisma mockado, este arquivo passaria mesmo se a
 * implementação fosse um `if` seguido de `update` — que é exatamente o bug
 * que ele existe para pegar.
 *
 * Pré-requisito: `npx prisma migrate reset` (migrations + seed).
 */

const SENHA = 'Senha@123';
const TENTATIVAS = 10;

// Paciente conhecido do seed. Cada teste cria seu próprio atendimento para não
// precisar executar uma transição proibida só para restaurar o estado.
const CPF_PACIENTE = '10000000003';

// Profissionais só deste arquivo. Os quatro clínicos do seed já têm
// EM_ANDAMENTO (a coluna gerada + unique), então usá-los faria todo iniciar
// devolver JA_TEM_ATENDIMENTO_ATIVO — e o teste deixaria de medir a corrida
// pelo mesmo atendimento, que é o que a regra 1 pede.
const CONCORRENTES = [
  'concorrente.1@pad.local',
  'concorrente.2@pad.local',
  'concorrente.3@pad.local',
];

describe('Concorrência ao assumir atendimento (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let pacienteId: string;
  let alvo: string;
  const atendimentosCriados = new Set<string>();
  const tokens: string[] = [];

  const logar = async (email: string): Promise<string> => {
    const r = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, senha: SENHA });

    expect(r.status).toBe(200);
    return (r.body as { token: string }).token;
  };

  const finalizarAtivosDosConcorrentes = async (): Promise<void> => {
    const ativos = await prisma.atendimento.findMany({
      where: {
        status: 'EM_ANDAMENTO',
        profissional: { email: { in: [...CONCORRENTES] } },
      },
      select: { id: true },
    });
    if (ativos.length === 0) {
      return;
    }

    const ids = ativos.map(({ id }) => id);
    const agora = new Date();
    await prisma.$transaction(async (tx) => {
      // Preserva o histórico entre execuções do teste. DELETE não só perderia
      // triagem como violaria as FKs/auditoria append-only do domínio.
      await tx.atendimento.updateMany({
        where: { id: { in: ids }, status: 'EM_ANDAMENTO' },
        data: { status: 'FINALIZADO', finalizadoEm: agora },
      });
      await tx.prontuario.updateMany({
        where: { atendimentoId: { in: ids }, finalizadoEm: null },
        data: { finalizadoEm: agora },
      });
      await tx.salaToken.updateMany({
        where: { atendimentoId: { in: ids }, revogadoEm: null },
        data: { revogadoEm: agora },
      });
    });
  };

  beforeAll(async () => {
    const fixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = fixture.createNestApplication();
    app.useGlobalFilters(new FiltroDeExcecoes());
    await app.init();
    // Sobe o servidor uma vez para o arquivo inteiro. Sem isto o supertest
    // chama `app.listen(0)` na primeira requisição e `server.close()` quando
    // ELA termina — o que derruba as requisições irmãs ainda em voo dentro de
    // um `Promise.all` e produz ECONNRESET em vez do status esperado.
    await app.listen(0);

    prisma = app.get(PrismaService);
    const paciente = await prisma.paciente.findUnique({
      where: { cpf: CPF_PACIENTE },
      select: { id: true },
    });
    if (!paciente) {
      throw new Error(`Paciente de teste ${CPF_PACIENTE} não encontrado`);
    }
    pacienteId = paciente.id;

    const senhaHash = await bcrypt.hash(SENHA, 10);
    for (const email of CONCORRENTES) {
      await prisma.usuario.upsert({
        where: { email },
        update: { senhaHash, ativo: true },
        create: {
          nome: email,
          email,
          senhaHash,
          papel: Papel.ENFERMEIRO,
        },
      });
      tokens.push(await logar(email));
    }
  });

  beforeEach(async () => {
    // Com a máquina de estados protegida também no banco, voltar de
    // EM_ANDAMENTO para AGUARDANDO seria uma violação real. Um alvo novo por
    // teste mantém o isolamento sem criar uma porta dos fundos no domínio.
    await finalizarAtivosDosConcorrentes();

    alvo = randomUUID();
    atendimentosCriados.add(alvo);
    await prisma.atendimento.create({
      data: {
        id: alvo,
        pacienteId,
        status: 'AGUARDANDO',
        risco: 'VERMELHO',
      },
    });
  });

  afterAll(async () => {
    if (prisma) {
      await finalizarAtivosDosConcorrentes();
      if (atendimentosCriados.size > 0) {
        await prisma.atendimento.updateMany({
          where: {
            id: { in: [...atendimentosCriados] },
            status: 'AGUARDANDO',
          },
          data: { status: 'CANCELADO', canceladoEm: new Date() },
        });
      }
    }
    await app?.close();
  });

  it(`${TENTATIVAS} requisições simultâneas: exatamente 1 sucesso e ${TENTATIVAS - 1} conflitos`, async () => {
    // Todas partem juntas. Sem Promise.all elas viram uma fila e o teste
    // deixa de testar concorrência.
    const respostas = await Promise.all(
      Array.from({ length: TENTATIVAS }, (_, i) =>
        request(app.getHttpServer())
          .post(`/atendimentos/${alvo}/iniciar`)
          .set({ Authorization: `Bearer ${tokens[i % tokens.length]}` }),
      ),
    );

    const criados = respostas.filter((r) => r.status === 201);
    const conflitos = respostas.filter((r) => r.status === 409);

    expect(criados).toHaveLength(1);
    expect(conflitos).toHaveLength(TENTATIVAS - 1);

    // Nenhuma resposta pode ter sido 500: perder a corrida é um desfecho
    // previsto, não um erro do servidor.
    expect(respostas.every((r) => r.status < 500)).toBe(true);
  });

  it('o vencedor é quem ficou gravado no banco', async () => {
    const respostas = await Promise.all(
      Array.from({ length: TENTATIVAS }, (_, i) =>
        request(app.getHttpServer())
          .post(`/atendimentos/${alvo}/iniciar`)
          .set({ Authorization: `Bearer ${tokens[i % tokens.length]}` }),
      ),
    );

    const vencedora = respostas.find((r) => r.status === 201);
    expect(vencedora).toBeDefined();

    const gravado = await prisma.atendimento.findUnique({
      where: { id: alvo },
      select: { status: true, profissionalId: true, iniciadoEm: true },
    });

    const corpo = vencedora?.body as {
      profissional: { id: string } | null;
      status: string;
    };

    expect(gravado?.status).toBe('EM_ANDAMENTO');
    expect(gravado?.profissionalId).toBe(corpo.profissional?.id);
    expect(gravado?.iniciadoEm).not.toBeNull();
  });

  it('conflito responde com o código que explica o motivo', async () => {
    const [primeira, segunda] = await Promise.all([
      request(app.getHttpServer())
        .post(`/atendimentos/${alvo}/iniciar`)
        .set({ Authorization: `Bearer ${tokens[0]}` }),
      request(app.getHttpServer())
        .post(`/atendimentos/${alvo}/iniciar`)
        .set({ Authorization: `Bearer ${tokens[1]}` }),
    ]);

    const perdedora = [primeira, segunda].find((r) => r.status === 409);
    expect(perdedora).toBeDefined();
    expect((perdedora?.body as { codigo: string }).codigo).toBe(
      'ATENDIMENTO_JA_ASSUMIDO',
    );
  });

  it('tentativa sequencial depois de assumido também é 409', async () => {
    const primeira = await request(app.getHttpServer())
      .post(`/atendimentos/${alvo}/iniciar`)
      .set({ Authorization: `Bearer ${tokens[0]}` });
    expect(primeira.status).toBe(201);

    const segunda = await request(app.getHttpServer())
      .post(`/atendimentos/${alvo}/iniciar`)
      .set({ Authorization: `Bearer ${tokens[1]}` });

    expect(segunda.status).toBe(409);
    expect((segunda.body as { codigo: string }).codigo).toBe(
      'ATENDIMENTO_JA_ASSUMIDO',
    );
  });

  it('profissional que já tem atendimento ativo não assume outro', async () => {
    // Regra 2, garantida pela coluna gerada + unique. Primeiro assume o alvo,
    // depois tenta assumir um segundo atendimento que está na fila.
    const primeiro = await request(app.getHttpServer())
      .post(`/atendimentos/${alvo}/iniciar`)
      .set({ Authorization: `Bearer ${tokens[0]}` });
    expect(primeiro.status).toBe(201);

    const outroDaFila = await prisma.atendimento.create({
      data: {
        id: randomUUID(),
        pacienteId,
        status: 'AGUARDANDO',
      },
      select: { id: true },
    });
    atendimentosCriados.add(outroDaFila.id);

    const segundo = await request(app.getHttpServer())
      .post(`/atendimentos/${outroDaFila.id}/iniciar`)
      .set({ Authorization: `Bearer ${tokens[0]}` });

    expect(segundo.status).toBe(409);
    expect((segundo.body as { codigo: string }).codigo).toBe(
      'JA_TEM_ATENDIMENTO_ATIVO',
    );
  });
});
