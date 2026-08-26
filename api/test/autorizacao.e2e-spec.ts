import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomInt } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { FiltroDeExcecoes } from '../src/common/erros/filtro-excecoes';

/**
 * Reprodução de docs/matriz-de-acesso.md, célula a célula.
 *
 * Roda contra o MySQL real com os dados do seed — de propósito. Um teste
 * de autorização com Prisma mockado prova apenas que o mock foi configurado
 * como o autor esperava; não prova que o guard nega. Aqui, se qualquer um dos
 * três guards for removido do app.module, alguma linha desta tabela fica
 * vermelha.
 *
 * Pré-requisito: `npx prisma migrate reset` (aplica migrations e roda o seed).
 */

const SENHA = process.env.SEED_DEMO_PASSWORD;
if (!SENHA) {
  throw new Error('SEED_DEMO_PASSWORD é obrigatória nos testes E2E');
}

const CONTAS = {
  ADMIN: 'admin@pad.local',
  ENFERMEIRO: 'ana.ferreira@pad.local',
  MEDICO: 'carla.nogueira@pad.local',
  // Segundo médico: existe para provar que "ser médico" não basta — é o
  // não vinculado das linhas 6, 11 e 17 da matriz.
  MEDICO_ALHEIO: 'diego.ramos@pad.local',
} as const;

type Conta = keyof typeof CONTAS;

// Ids fixos do seed. Ver prisma/seed.ts.
const ATENDIMENTO_DA_CARLA = 'c0000000-0000-4000-8000-000000000006'; // EM_ANDAMENTO
const ATENDIMENTO_DO_DIEGO = 'c0000000-0000-4000-8000-000000000011'; // FINALIZADO com prontuário
const ATENDIMENTO_NA_FILA = 'c0000000-0000-4000-8000-000000000001'; // AGUARDANDO
const ATENDIMENTO_CANCELADO = 'c0000000-0000-4000-8000-000000000014'; // sem profissional
const ATENDIMENTO_INEXISTENTE = 'c0000000-0000-4000-8000-0000000000ff';

describe('Matriz de autorização (e2e)', () => {
  let app: INestApplication<App>;
  const tokens = {} as Record<Conta, string>;

  beforeAll(async () => {
    const fixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = fixture.createNestApplication();
    // O filtro global vem de APP_FILTER no módulo, mas o Nest só o aplica na
    // instância criada por NestFactory. No teste, registra na mão para que os
    // códigos aqui sejam os mesmos que o cliente recebe em produção.
    app.useGlobalFilters(new FiltroDeExcecoes());
    await app.init();
    // Sobe o servidor uma vez para o arquivo inteiro. Sem isto o supertest
    // chama `app.listen(0)` na primeira requisição e `server.close()` quando
    // ELA termina — o que derruba as requisições irmãs ainda em voo dentro de
    // um `Promise.all` e produz ECONNRESET em vez do status esperado.
    await app.listen(0);

    for (const [conta, email] of Object.entries(CONTAS) as [Conta, string][]) {
      const resposta = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, senha: SENHA });

      // Sem o corpo, 401 do guard (NAO_AUTENTICADO) e 401 de senha
      // (CREDENCIAIS_INVALIDAS) parecem o mesmo erro. O segundo some com
      // `npx prisma db seed`; o primeiro é rota pública que o JWT engoliu.
      if (resposta.status !== 200) {
        throw new Error(
          `login ${email} → ${resposta.status} ${JSON.stringify(resposta.body)}`,
        );
      }
      tokens[conta] = (resposta.body as { token: string }).token;
    }
  });

  afterAll(async () => {
    // `?.` porque se o beforeAll falhar (ambiente mal configurado, banco fora
    // do ar) o app nunca é criado, e um erro no afterAll esconderia a causa
    // real atrás de "Cannot read properties of undefined".
    await app?.close();
  });

  const comToken = (conta: Conta) => ({
    Authorization: `Bearer ${tokens[conta]}`,
  });

  describe('login', () => {
    it('senha errada → 401', async () => {
      const r = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: CONTAS.ADMIN, senha: 'errada' });

      expect(r.status).toBe(401);
      expect((r.body as { codigo: string }).codigo).toBe(
        'CREDENCIAIS_INVALIDAS',
      );
    });

    it('e-mail inexistente devolve a mesma resposta de senha errada', async () => {
      const r = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'ninguem@pad.local', senha: SENHA });

      // Mesmo código e mesma mensagem: a API não confirma quais e-mails
      // existem. Enumerar contas é o passo anterior à força bruta.
      expect(r.status).toBe(401);
      expect((r.body as { codigo: string }).codigo).toBe(
        'CREDENCIAIS_INVALIDAS',
      );
    });

    it('corpo inválido → 400', async () => {
      const r = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'não-é-email', senha: '' });

      expect(r.status).toBe(400);
    });
  });

  describe('rota pública', () => {
    it('GET /saude sem token → 200', async () => {
      const r = await request(app.getHttpServer()).get('/saude');
      expect(r.status).toBe(200);
    });
  });

  // ---------------------------------------------------------------------
  // A tabela. Uma linha por célula da matriz que já tem rota implementada.
  // ---------------------------------------------------------------------

  interface Caso {
    descricao: string;
    conta: Conta | 'ANONIMO';
    rota: string;
    esperado: number;
    metodo?: 'GET' | 'POST';
    corpo?: () => Record<string, unknown>;
  }

  const CASOS: Caso[] = [
    // Linha 2 da matriz — fila. ADMIN não vê dado clínico.
    {
      descricao: 'fila / anônimo',
      conta: 'ANONIMO',
      rota: '/atendimentos',
      esperado: 401,
    },
    {
      descricao: 'fila / enfermeiro',
      conta: 'ENFERMEIRO',
      rota: '/atendimentos',
      esperado: 200,
    },
    {
      descricao: 'fila / médico',
      conta: 'MEDICO',
      rota: '/atendimentos',
      esperado: 200,
    },
    {
      descricao: 'fila / admin',
      conta: 'ADMIN',
      rota: '/atendimentos',
      esperado: 403,
    },

    // Linhas 10, 11 e 14 — dado clínico exige papel e escopo.
    {
      descricao: 'prontuário / anônimo',
      conta: 'ANONIMO',
      rota: `/atendimentos/${ATENDIMENTO_DO_DIEGO}/prontuario`,
      esperado: 401,
    },
    {
      descricao: 'prontuário / enfermeiro',
      conta: 'ENFERMEIRO',
      rota: `/atendimentos/${ATENDIMENTO_DO_DIEGO}/prontuario`,
      esperado: 403,
    },
    {
      descricao: 'prontuário / admin',
      conta: 'ADMIN',
      rota: `/atendimentos/${ATENDIMENTO_DO_DIEGO}/prontuario`,
      esperado: 403,
    },
    {
      descricao: 'prontuário / médico vinculado',
      conta: 'MEDICO_ALHEIO',
      rota: `/atendimentos/${ATENDIMENTO_DO_DIEGO}/prontuario`,
      esperado: 200,
    },
    {
      descricao: 'prontuário / médico não vinculado',
      conta: 'MEDICO',
      rota: `/atendimentos/${ATENDIMENTO_DO_DIEGO}/prontuario`,
      esperado: 403,
    },
    {
      descricao: 'pacientes / enfermeiro',
      conta: 'ENFERMEIRO',
      rota: '/pacientes',
      esperado: 200,
    },
    {
      descricao: 'pacientes / médico',
      conta: 'MEDICO',
      rota: '/pacientes',
      esperado: 200,
    },
    {
      descricao: 'pacientes / admin',
      conta: 'ADMIN',
      rota: '/pacientes',
      esperado: 403,
    },
    {
      descricao: 'pacientes / anônimo',
      conta: 'ANONIMO',
      rota: '/pacientes',
      esperado: 401,
    },

    // Linhas 21 e 24 — área administrativa sem conteúdo clínico.
    {
      descricao: 'usuários / admin',
      conta: 'ADMIN',
      rota: '/usuarios',
      esperado: 200,
    },
    {
      descricao: 'usuários / enfermeiro',
      conta: 'ENFERMEIRO',
      rota: '/usuarios',
      esperado: 403,
    },
    {
      descricao: 'usuários / médico',
      conta: 'MEDICO',
      rota: '/usuarios',
      esperado: 403,
    },
    {
      descricao: 'usuários / anônimo',
      conta: 'ANONIMO',
      rota: '/usuarios',
      esperado: 401,
    },
    {
      descricao: 'auditoria / admin',
      conta: 'ADMIN',
      rota: '/auditoria',
      esperado: 200,
    },
    {
      descricao: 'auditoria / enfermeiro',
      conta: 'ENFERMEIRO',
      rota: '/auditoria',
      esperado: 403,
    },
    {
      descricao: 'auditoria / médico',
      conta: 'MEDICO',
      rota: '/auditoria',
      esperado: 403,
    },
    {
      descricao: 'auditoria / anônimo',
      conta: 'ANONIMO',
      rota: '/auditoria',
      esperado: 401,
    },

    // Linhas 25 a 27 — detalhe do atendimento, escopo por vínculo.
    {
      descricao: 'detalhe / anônimo',
      conta: 'ANONIMO',
      rota: `/atendimentos/${ATENDIMENTO_DA_CARLA}`,
      esperado: 401,
    },
    {
      descricao: 'detalhe / admin',
      conta: 'ADMIN',
      rota: `/atendimentos/${ATENDIMENTO_DA_CARLA}`,
      esperado: 403,
    },
    {
      descricao: 'detalhe / médico vinculado',
      conta: 'MEDICO',
      rota: `/atendimentos/${ATENDIMENTO_DA_CARLA}`,
      esperado: 200,
    },
    {
      descricao: 'detalhe / médico NÃO vinculado — troca de id na URL',
      conta: 'MEDICO_ALHEIO',
      rota: `/atendimentos/${ATENDIMENTO_DA_CARLA}`,
      esperado: 403,
    },
    {
      descricao: 'detalhe / atendimento na fila, ainda sem dono',
      conta: 'ENFERMEIRO',
      rota: `/atendimentos/${ATENDIMENTO_NA_FILA}`,
      esperado: 200,
    },
    {
      descricao: 'detalhe / cancelado sem profissional continua protegido',
      conta: 'ENFERMEIRO',
      rota: `/atendimentos/${ATENDIMENTO_CANCELADO}`,
      esperado: 403,
    },
    {
      descricao: 'detalhe / id inexistente responde 403, não 404',
      conta: 'MEDICO',
      rota: `/atendimentos/${ATENDIMENTO_INEXISTENTE}`,
      esperado: 403,
    },
    {
      // Guard roda antes do ParseUUIDPipe: id malformado não pode virar 500.
      descricao: 'detalhe / id malformado',
      conta: 'MEDICO',
      rota: '/atendimentos/abc',
      esperado: 403,
    },

    // Linha 29 — cadastro e entrada na fila são exclusivos da enfermagem.
    ...(['ENFERMEIRO', 'MEDICO', 'ADMIN', 'ANONIMO'] as const).map(
      (conta): Caso => ({
        descricao: `cadastro de paciente / ${conta.toLowerCase()}`,
        conta,
        rota: '/atendimentos/cadastrar-paciente',
        metodo: 'POST',
        corpo: () => ({
          nome: 'Paciente da matriz de autorização',
          cpf: `8${randomInt(10_000_000_000).toString().padStart(10, '0')}`,
          contato: '(31) 98888-8888',
          nascimento: '1990-06-15',
        }),
        esperado:
          conta === 'ENFERMEIRO' ? 201 : conta === 'ANONIMO' ? 401 : 403,
      }),
    ),
  ];

  // `$descricao` em vez de `%s`: com linhas em objeto o Jest interpola pelo
  // nome do campo. A versão com printf posicional consumia os argumentos na
  // ordem da tupla e imprimia "NaN" no lugar do status esperado.
  it.each(CASOS)(
    '$descricao → $esperado',
    async ({ conta, rota, esperado, metodo = 'GET', corpo }) => {
      const requisicao =
        metodo === 'POST'
          ? request(app.getHttpServer()).post(rota).send(corpo?.())
          : request(app.getHttpServer()).get(rota);

      if (conta !== 'ANONIMO') {
        requisicao.set(comToken(conta));
      }

      const resposta = await requisicao;
      expect(resposta.status).toBe(esperado);
    },
  );

  describe('token', () => {
    it('token forjado → 401', async () => {
      const r = await request(app.getHttpServer())
        .get('/atendimentos')
        .set({ Authorization: 'Bearer nao.e.um.token' });

      expect(r.status).toBe(401);
    });

    it('sem prefixo Bearer → 401', async () => {
      const r = await request(app.getHttpServer())
        .get('/atendimentos')
        .set({ Authorization: tokens.MEDICO });

      expect(r.status).toBe(401);
    });
  });
});
