import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import { createHash, randomInt, randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { Papel, Participante, TipoTokenSala } from '../generated/prisma/client';
import { AppModule } from '../src/app.module';
import { FiltroDeExcecoes } from '../src/common/erros/filtro-excecoes';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { LiveKitProvider } from '../src/sala/livekit.provider';
import { LiveKitFakeE2e } from './livekit-fake.e2e';

const SENHA = 'Senha@123';

type Perfil = 'dono' | 'alheio' | 'admin';

describe('Sala e tokens de vídeo (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let livekit: LiveKitFakeE2e;
  let pacienteId: string;
  let atendimentoId: string;
  let atendimentoAlheioId: string;
  const tokens = {} as Record<Perfil, string>;

  const bearer = (perfil: Perfil) => ({
    Authorization: `Bearer ${tokens[perfil]}`,
  });

  const hash = (token: string) =>
    createHash('sha256').update(token).digest('hex');

  const autenticar = async (email: string): Promise<string> => {
    const resposta = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, senha: SENHA });
    expect(resposta.status).toBe(200);
    return (resposta.body as { token: string }).token;
  };

  const criarLink = async (): Promise<string> => {
    const resposta = await request(app.getHttpServer())
      .post(`/atendimentos/${atendimentoId}/sala/link-paciente`)
      .set(bearer('dono'));
    expect(resposta.status).toBe(201);
    return (resposta.body as { token: string }).token;
  };

  beforeAll(async () => {
    livekit = new LiveKitFakeE2e();
    const fixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(LiveKitProvider)
      .useValue(livekit)
      .compile();

    app = fixture.createNestApplication();
    app.useGlobalFilters(new FiltroDeExcecoes());
    await app.init();
    // Sobe o servidor uma vez para o arquivo inteiro. Sem isto o supertest
    // chama `app.listen(0)` na primeira requisição e `server.close()` quando
    // ELA termina — o que derruba as requisições irmãs ainda em voo dentro de
    // um `Promise.all` e produz ECONNRESET em vez do status esperado.
    await app.listen(0);
    prisma = app.get(PrismaService);

    const sufixo = randomUUID();
    const senhaHash = await bcrypt.hash(SENHA, 10);
    const [dono, alheio, admin] = await Promise.all([
      prisma.usuario.create({
        data: {
          nome: 'Enfermeira da sala E2E',
          email: `sala.dono.${sufixo}@e2e.local`,
          senhaHash,
          papel: Papel.ENFERMEIRO,
        },
      }),
      prisma.usuario.create({
        data: {
          nome: 'Enfermeiro sem vínculo E2E',
          email: `sala.alheio.${sufixo}@e2e.local`,
          senhaHash,
          papel: Papel.ENFERMEIRO,
        },
      }),
      prisma.usuario.create({
        data: {
          nome: 'Admin da sala E2E',
          email: `sala.admin.${sufixo}@e2e.local`,
          senhaHash,
          papel: Papel.ADMIN,
        },
      }),
    ]);
    [tokens.dono, tokens.alheio, tokens.admin] = await Promise.all([
      autenticar(dono.email),
      autenticar(alheio.email),
      autenticar(admin.email),
    ]);

    const cpf = `7${randomInt(10_000_000_000).toString().padStart(10, '0')}`;
    const paciente = await prisma.paciente.create({
      data: {
        nome: 'Paciente da sala E2E',
        cpf,
        contato: '(31) 97777-7777',
        nascimento: new Date('1992-04-10T00:00:00.000Z'),
      },
    });
    pacienteId = paciente.id;

    const [atendimento, alheioAtendimento] = await Promise.all([
      prisma.atendimento.create({
        data: {
          pacienteId,
          profissionalId: dono.id,
          status: 'EM_ANDAMENTO',
          iniciadoEm: new Date(),
        },
      }),
      prisma.atendimento.create({
        data: {
          pacienteId,
          profissionalId: alheio.id,
          status: 'EM_ANDAMENTO',
          iniciadoEm: new Date(),
        },
      }),
    ]);
    atendimentoId = atendimento.id;
    atendimentoAlheioId = alheioAtendimento.id;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('emite e renova token profissional apenas para o vinculado', async () => {
    const anonimo = await request(app.getHttpServer()).post(
      `/atendimentos/${atendimentoId}/sala/token`,
    );
    expect(anonimo.status).toBe(401);

    const negadoPorVinculo = await request(app.getHttpServer())
      .post(`/atendimentos/${atendimentoId}/sala/token`)
      .set(bearer('alheio'));
    expect(negadoPorVinculo.status).toBe(403);

    const negadoPorPapel = await request(app.getHttpServer())
      .post(`/atendimentos/${atendimentoId}/sala/token`)
      .set(bearer('admin'));
    expect(negadoPorPapel.status).toBe(403);

    const primeiro = await request(app.getHttpServer())
      .post(`/atendimentos/${atendimentoId}/sala/token`)
      .set(bearer('dono'));
    expect(primeiro.status).toBe(201);
    const primeiroCorpo = primeiro.body as {
      token: string;
      url: string;
      sala: string;
      expiraEm: string;
    };
    expect(primeiroCorpo.url).toBe('ws://livekit.fake');
    expect(primeiroCorpo.sala).toBe(`atendimento-${atendimentoId}`);
    expect(
      new Date(primeiroCorpo.expiraEm).getTime() - Date.now(),
    ).toBeLessThanOrEqual(900_000);

    const renovado = await request(app.getHttpServer())
      .post(`/atendimentos/${atendimentoId}/sala/renovar`)
      .set(bearer('dono'));
    expect(renovado.status).toBe(200);
    const segundoToken = (renovado.body as { token: string }).token;
    expect(segundoToken).not.toBe(primeiroCorpo.token);

    const primeiroPersistido = await prisma.salaToken.findUnique({
      where: { tokenHash: hash(primeiroCorpo.token) },
      select: { revogadoEm: true },
    });
    const segundoPersistido = await prisma.salaToken.findUnique({
      where: { tokenHash: hash(segundoToken) },
      select: { revogadoEm: true, tipo: true, participante: true },
    });
    expect(primeiroPersistido?.revogadoEm).not.toBeNull();
    expect(segundoPersistido).toMatchObject({
      revogadoEm: null,
      tipo: TipoTokenSala.ACESSO_LIVEKIT,
      participante: Participante.PROFISSIONAL,
    });
  });

  it('guarda somente o hash do link e recusa outro atendimento', async () => {
    const [anonimo, semVinculo, semPapel] = await Promise.all([
      request(app.getHttpServer()).post(
        `/atendimentos/${atendimentoId}/sala/link-paciente`,
      ),
      request(app.getHttpServer())
        .post(`/atendimentos/${atendimentoId}/sala/link-paciente`)
        .set(bearer('alheio')),
      request(app.getHttpServer())
        .post(`/atendimentos/${atendimentoId}/sala/link-paciente`)
        .set(bearer('admin')),
    ]);
    expect(anonimo.status).toBe(401);
    expect(semVinculo.status).toBe(403);
    expect(semPapel.status).toBe(403);

    const token = await criarLink();
    const persistido = await prisma.salaToken.findUnique({
      where: { tokenHash: hash(token) },
      select: { tokenHash: true, tipo: true, usadoEm: true },
    });
    expect(persistido?.tokenHash).not.toBe(token);
    expect(persistido).toMatchObject({
      tipo: TipoTokenSala.LINK_PACIENTE,
      usadoEm: null,
    });

    const atendimentoErrado = await request(app.getHttpServer())
      .post(`/sala/${token}/entrar`)
      .send({ atendimentoId: atendimentoAlheioId });
    expect(atendimentoErrado.status).toBe(403);

    // A tentativa no atendimento errado não queima o link correto.
    const valido = await request(app.getHttpServer())
      .post(`/sala/${token}/entrar`)
      .send({ atendimentoId });
    expect(valido.status).toBe(200);
    expect((valido.body as { participante: string }).participante).toBe(
      'PACIENTE',
    );

    const reutilizado = await request(app.getHttpServer())
      .post(`/sala/${token}/entrar`)
      .send({ atendimentoId });
    expect(reutilizado.status).toBe(403);
  });

  it('dois usos simultâneos do link produzem exatamente um vencedor', async () => {
    const token = await criarLink();
    const respostas = await Promise.all([
      request(app.getHttpServer())
        .post(`/sala/${token}/entrar`)
        .send({ atendimentoId }),
      request(app.getHttpServer())
        .post(`/sala/${token}/entrar`)
        .send({ atendimentoId }),
    ]);

    expect(respostas.filter(({ status }) => status === 200)).toHaveLength(1);
    expect(respostas.filter(({ status }) => status === 403)).toHaveLength(1);
  });

  it('renova o acesso do paciente em até 15 minutos e invalida o anterior', async () => {
    const link = await criarLink();
    const entrada = await request(app.getHttpServer())
      .post(`/sala/${link}/entrar`)
      .send({ atendimentoId });
    expect(entrada.status).toBe(200);
    const tokenAtual = (entrada.body as { token: string }).token;

    const renovacao = await request(app.getHttpServer())
      .post(`/sala/${atendimentoId}/renovar`)
      .send({ token: tokenAtual });
    expect(renovacao.status).toBe(200);
    const renovado = renovacao.body as { token: string; expiraEm: string };
    expect(renovado.token).not.toBe(tokenAtual);
    expect(
      new Date(renovado.expiraEm).getTime() - Date.now(),
    ).toBeLessThanOrEqual(900_000);

    const [anteriorPersistido, novoPersistido] = await Promise.all([
      prisma.salaToken.findUnique({
        where: { tokenHash: hash(tokenAtual) },
        select: { revogadoEm: true },
      }),
      prisma.salaToken.findUnique({
        where: { tokenHash: hash(renovado.token) },
        select: { revogadoEm: true, participante: true, tipo: true },
      }),
    ]);
    expect(anteriorPersistido?.revogadoEm).not.toBeNull();
    expect(novoPersistido).toMatchObject({
      revogadoEm: null,
      participante: Participante.PACIENTE,
      tipo: TipoTokenSala.ACESSO_LIVEKIT,
    });

    const reutilizacao = await request(app.getHttpServer())
      .post(`/sala/${atendimentoId}/renovar`)
      .send({ token: tokenAtual });
    expect(reutilizacao.status).toBe(403);
  });

  it('recusa link expirado sem revelar o motivo', async () => {
    const token = await criarLink();
    await prisma.salaToken.update({
      where: { tokenHash: hash(token) },
      data: { expiraEm: new Date(Date.now() - 1_000) },
    });

    const resposta = await request(app.getHttpServer())
      .post(`/sala/${token}/entrar`)
      .send({ atendimentoId });
    expect(resposta.status).toBe(403);
    expect((resposta.body as { codigo: string }).codigo).toBe('ACESSO_NEGADO');
  });

  it('finalização revoga tudo, fecha o provedor e impede nova entrada', async () => {
    const linkPendente = await criarLink();
    const finalizacao = await request(app.getHttpServer())
      .post(`/atendimentos/${atendimentoId}/finalizar`)
      .set(bearer('dono'));
    expect(finalizacao.status).toBe(200);
    expect(livekit.salasEncerradas).toContain(atendimentoId);

    const ativos = await prisma.salaToken.count({
      where: { atendimentoId, revogadoEm: null },
    });
    expect(ativos).toBe(0);

    const linkRevogado = await request(app.getHttpServer())
      .post(`/sala/${linkPendente}/entrar`)
      .send({ atendimentoId });
    expect(linkRevogado.status).toBe(403);

    const tokenDepoisDoFim = await request(app.getHttpServer())
      .post(`/atendimentos/${atendimentoId}/sala/token`)
      .set(bearer('dono'));
    expect(tokenDepoisDoFim.status).toBe(422);
  });

  it('encaminhamento também encerra a sala de origem', async () => {
    const triagem = await request(app.getHttpServer())
      .post(`/atendimentos/${atendimentoAlheioId}/triagem`)
      .set(bearer('alheio'))
      .send({
        risco: 'VERDE',
        queixa: 'Paciente apto para encaminhamento médico',
      });
    expect(triagem.status).toBe(201);

    const encaminhamento = await request(app.getHttpServer())
      .post(`/atendimentos/${atendimentoAlheioId}/encaminhar`)
      .set(bearer('alheio'));
    expect(encaminhamento.status).toBe(201);
    expect(livekit.salasEncerradas).toContain(atendimentoAlheioId);
  });

  it('audita entrada sem gravar o token opaco no endpoint', async () => {
    const logs = await prisma.logAuditoria.findMany({
      where: {
        atendimentoId,
        acao: 'SALA_ENTRADA_PACIENTE',
      },
      select: { endpoint: true, statusHttp: true, usuarioId: true },
    });

    expect(logs.some(({ statusHttp }) => statusHttp === 200)).toBe(true);
    expect(logs.some(({ statusHttp }) => statusHttp === 403)).toBe(true);
    expect(
      logs.every(({ endpoint }) => endpoint === '/sala/:token/entrar'),
    ).toBe(true);
    expect(logs.every(({ usuarioId }) => usuarioId === null)).toBe(true);
  });

  it('limita tentativas em volume no link público', async () => {
    const respostas = await Promise.all(
      Array.from({ length: 12 }, (_, indice) =>
        request(app.getHttpServer())
          .post(`/sala/${String(indice).padStart(43, 'a')}/entrar`)
          .send({ atendimentoId }),
      ),
    );

    expect(respostas.some(({ status }) => status === 429)).toBe(true);
  });
});
