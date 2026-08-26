import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Aplicação (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const fixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = fixture.createNestApplication();
    await app.init();
    // Sobe o servidor uma vez para o arquivo inteiro. Sem isto o supertest
    // chama `app.listen(0)` na primeira requisição e `server.close()` quando
    // ELA termina — o que derruba as requisições irmãs ainda em voo dentro de
    // um `Promise.all` e produz ECONNRESET em vez do status esperado.
    await app.listen(0);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('GET /saude responde sem autenticação', async () => {
    const r = await request(app.getHttpServer()).get('/saude');
    expect(r.status).toBe(200);
    expect((r.body as { status: string }).status).toBe('ok');
  });

  // A rota inexistente precisa cair no 404 do Nest, e não ser engolida pelos
  // guards globais com um 401 — senão a API vira um oráculo às avessas.
  it('rota inexistente → 404', async () => {
    const r = await request(app.getHttpServer()).get('/nao-existe');
    expect(r.status).toBe(404);
  });
});
