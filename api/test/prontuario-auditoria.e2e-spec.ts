import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import { randomInt, randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { Papel } from '../generated/prisma/client';
import { AppModule } from '../src/app.module';
import { FiltroDeExcecoes } from '../src/common/erros/filtro-excecoes';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { LiveKitProvider } from '../src/sala/livekit.provider';
import { LiveKitFakeE2e } from './livekit-fake.e2e';

const SENHA = 'Senha@123';

type Perfil = 'admin' | 'enfermeiro' | 'medico' | 'medicoAlheio';

describe('Prontuário, pacientes, auditoria e usuários (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let pacienteId: string;
  let atendimentoId: string;
  let prontuarioId: string;
  let adminId: string;
  const tokens = {} as Record<Perfil, string>;

  const bearer = (perfil: Perfil) => ({
    Authorization: `Bearer ${tokens[perfil]}`,
  });

  beforeAll(async () => {
    const fixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(LiveKitProvider)
      .useValue(new LiveKitFakeE2e())
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
    const criados = await Promise.all([
      prisma.usuario.create({
        data: {
          nome: 'Admin E2E',
          email: `admin.${sufixo}@e2e.local`,
          senhaHash,
          papel: Papel.ADMIN,
        },
      }),
      prisma.usuario.create({
        data: {
          nome: 'Enfermeira E2E',
          email: `enfermeiro.${sufixo}@e2e.local`,
          senhaHash,
          papel: Papel.ENFERMEIRO,
        },
      }),
      prisma.usuario.create({
        data: {
          nome: 'Médica E2E',
          email: `medico.${sufixo}@e2e.local`,
          senhaHash,
          papel: Papel.MEDICO,
        },
      }),
      prisma.usuario.create({
        data: {
          nome: 'Médico sem vínculo E2E',
          email: `medico.alheio.${sufixo}@e2e.local`,
          senhaHash,
          papel: Papel.MEDICO,
        },
      }),
    ]);
    adminId = criados[0].id;

    const perfis: Perfil[] = ['admin', 'enfermeiro', 'medico', 'medicoAlheio'];
    await Promise.all(
      criados.map(async (usuario, indice) => {
        const resposta = await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: usuario.email, senha: SENHA });
        expect(resposta.status).toBe(200);
        tokens[perfis[indice]] = (resposta.body as { token: string }).token;
      }),
    );

    const cpf = `8${randomInt(10_000_000_000).toString().padStart(10, '0')}`;
    const paciente = await prisma.paciente.create({
      data: {
        nome: 'Paciente do prontuário E2E',
        cpf,
        contato: '(21) 98888-8888',
        nascimento: new Date('1984-06-20T00:00:00.000Z'),
      },
    });
    pacienteId = paciente.id;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('exige prontuário e finaliza o registro médico de forma atômica', async () => {
    const entrada = await request(app.getHttpServer())
      .post('/atendimentos')
      .set(bearer('medico'))
      .send({ pacienteId });
    expect(entrada.status).toBe(201);
    atendimentoId = (entrada.body as { id: string }).id;

    const inicio = await request(app.getHttpServer())
      .post(`/atendimentos/${atendimentoId}/iniciar`)
      .set(bearer('medico'));
    expect(inicio.status).toBe(201);

    const semProntuario = await request(app.getHttpServer())
      .post(`/atendimentos/${atendimentoId}/finalizar`)
      .set(bearer('medico'));
    expect(semProntuario.status).toBe(422);

    const criacao = await request(app.getHttpServer())
      .post(`/atendimentos/${atendimentoId}/prontuario`)
      .set(bearer('medico'))
      .send({
        anamnese: 'Paciente relata cefaleia leve sem sinais de alarme.',
        conduta: 'Orientação clínica e acompanhamento dos sintomas.',
        prescricao: 'Dipirona 500 mg se necessário.',
      });
    expect(criacao.status).toBe(201);
    prontuarioId = (criacao.body as { id: string }).id;

    const edicao = await request(app.getHttpServer())
      .patch(`/prontuarios/${prontuarioId}`)
      .set(bearer('medico'))
      .send({ conduta: 'Orientação, hidratação e retorno se houver piora.' });
    expect(edicao.status).toBe(200);

    const finalizacao = await request(app.getHttpServer())
      .post(`/atendimentos/${atendimentoId}/finalizar`)
      .set(bearer('medico'));
    expect(finalizacao.status).toBe(200);
    expect((finalizacao.body as { status: string }).status).toBe('FINALIZADO');

    const persistido = await prisma.prontuario.findUnique({
      where: { id: prontuarioId },
      select: { finalizadoEm: true },
    });
    expect(persistido?.finalizadoEm).not.toBeNull();
  });

  it('recusa edição após finalizar e aceita somente correção por adendo', async () => {
    const edicao = await request(app.getHttpServer())
      .patch(`/prontuarios/${prontuarioId}`)
      .set(bearer('medico'))
      .send({ conduta: 'Tentativa de sobrescrever o registro final.' });
    expect(edicao.status).toBe(409);
    expect((edicao.body as { codigo: string }).codigo).toBe(
      'PRONTUARIO_IMUTAVEL',
    );

    await expect(
      prisma.prontuario.update({
        where: { id: prontuarioId },
        data: { conduta: 'Tentativa direta no banco' },
      }),
    ).rejects.toThrow();

    const adendo = await request(app.getHttpServer())
      .post(`/prontuarios/${prontuarioId}/adendos`)
      .set(bearer('medico'))
      .send({ texto: 'Correção: manter hidratação oral por 48 horas.' });
    expect(adendo.status).toBe(201);
    const adendos = (adendo.body as { adendos: Array<{ id: string }> }).adendos;
    expect(adendos).toHaveLength(1);

    await expect(
      prisma.prontuarioAdendo.update({
        where: { id: adendos[0].id },
        data: { texto: 'Tentativa de alteração' },
      }),
    ).rejects.toThrow();
  });

  it('registra leituras permitidas e tentativas negadas sem expor conteúdo', async () => {
    const permitido = await request(app.getHttpServer())
      .get(`/atendimentos/${atendimentoId}/prontuario`)
      .set(bearer('medico'));
    expect(permitido.status).toBe(200);

    const medicoAlheio = await request(app.getHttpServer())
      .get(`/atendimentos/${atendimentoId}/prontuario`)
      .set(bearer('medicoAlheio'));
    expect(medicoAlheio.status).toBe(403);

    const enfermeiro = await request(app.getHttpServer())
      .get(`/atendimentos/${atendimentoId}/prontuario`)
      .set(bearer('enfermeiro'));
    expect(enfermeiro.status).toBe(403);

    const auditoria = await request(app.getHttpServer())
      .get('/auditoria')
      .query({ pacienteId, porPagina: 100 })
      .set(bearer('admin'));
    expect(auditoria.status).toBe(200);
    const itens = auditoria.body as {
      itens: Array<{
        id: string;
        acao: string;
        statusHttp: number;
        endpoint: string;
      }>;
    };
    const leituras = itens.itens.filter(
      ({ acao }) => acao === 'PRONTUARIO_LEITURA',
    );
    expect(leituras.some(({ statusHttp }) => statusHttp === 200)).toBe(true);
    expect(
      leituras.filter(({ statusHttp }) => statusHttp === 403),
    ).toHaveLength(2);
    expect(leituras.every(({ endpoint }) => !endpoint.includes('?'))).toBe(
      true,
    );
    expect(Object.hasOwn(itens.itens[0], 'anamnese')).toBe(false);

    await expect(
      prisma.logAuditoria.update({
        where: { id: itens.itens[0].id },
        data: { acao: 'TENTATIVA_DE_ALTERACAO' },
      }),
    ).rejects.toThrow();
  });

  it('entrega histórico completo ao médico e omite prontuário do enfermeiro', async () => {
    // A fila compartilhada cria escopo assistencial para o enfermeiro sem lhe
    // dar acesso ao conteúdo médico do atendimento já finalizado.
    await prisma.atendimento.create({ data: { pacienteId } });

    const historicoMedico = await request(app.getHttpServer())
      .get(`/pacientes/${pacienteId}`)
      .set(bearer('medico'));
    expect(historicoMedico.status).toBe(200);
    const itensMedico = (
      historicoMedico.body as {
        atendimentos: Array<{
          id: string;
          prontuario: { id: string } | null;
        }>;
      }
    ).atendimentos;
    expect(
      itensMedico.find(({ id }) => id === atendimentoId)?.prontuario?.id,
    ).toBe(prontuarioId);

    const historicoEnfermeiro = await request(app.getHttpServer())
      .get(`/pacientes/${pacienteId}`)
      .set(bearer('enfermeiro'));
    expect(historicoEnfermeiro.status).toBe(200);
    const itemFinalizado = (
      historicoEnfermeiro.body as {
        atendimentos: Array<Record<string, unknown> & { id: string }>;
      }
    ).atendimentos.find(({ id }) => id === atendimentoId);
    expect(itemFinalizado).toBeDefined();
    expect(Object.hasOwn(itemFinalizado ?? {}, 'prontuario')).toBe(false);
  });

  it('restringe gestão de usuários ao ADMIN e impede autobloqueio', async () => {
    const email = `usuario.gerenciado.${randomUUID()}@e2e.local`;
    const criacao = await request(app.getHttpServer())
      .post('/usuarios')
      .set(bearer('admin'))
      .send({
        nome: 'Usuário gerenciado E2E',
        email,
        senha: SENHA,
        papel: 'ENFERMEIRO',
      });
    expect(criacao.status).toBe(201);
    expect(Object.hasOwn(criacao.body as object, 'senhaHash')).toBe(false);
    const usuarioId = (criacao.body as { id: string }).id;

    const semPermissao = await request(app.getHttpServer())
      .get('/usuarios')
      .set(bearer('enfermeiro'));
    expect(semPermissao.status).toBe(403);

    const desativacao = await request(app.getHttpServer())
      .patch(`/usuarios/${usuarioId}`)
      .set(bearer('admin'))
      .send({ ativo: false });
    expect(desativacao.status).toBe(200);

    const loginDesativado = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, senha: SENHA });
    expect(loginDesativado.status).toBe(401);

    const autobloqueio = await request(app.getHttpServer())
      .patch(`/usuarios/${adminId}`)
      .set(bearer('admin'))
      .send({ ativo: false });
    expect(autobloqueio.status).toBe(409);
    expect((autobloqueio.body as { codigo: string }).codigo).toBe(
      'AUTO_BLOQUEIO_ADMIN',
    );
  });
});
