# PAD — API

Backend NestJS + Prisma + MySQL do Pronto Atendimento Digital.

Passo a passo de execução local, Docker, variáveis e testes está no
[README da raiz](../README.md). Este arquivo só descreve o que vive nesta pasta.

## Scripts

```bash
npm ci
npx prisma generate
npx prisma migrate deploy
npm run db:seed
npm run start:dev    # http://localhost:3000  — Swagger em /docs
npm test             # unitários (Jest)
npm run test:e2e:local # cria pad_test temporário, testa e remove tudo
npm run test:e2e       # baixo nível; exige DATABASE_URL em banco pad_test*
```

`npm run db:deploy` aplica migrations e o seed. No Compose de produção o
serviço `migrate` roda só `prisma migrate deploy`. O seed é comando à parte.

Para uma instalação nova, prefira `npm run test:e2e:local`. O executor usa o
`docker-compose.test.yml` da raiz, não depende do banco `pad` e sempre tenta
remover o MySQL temporário ao terminar.

## Onde mexer

| Pasta | Responsabilidade |
|---|---|
| `src/atendimento/` | Fila, transições, triagem e concorrência |
| `src/paciente/` | Listagem e histórico autorizado |
| `src/prontuario/` | Prontuário, finalização e adendos |
| `src/sala/` | Tokens e LiveKit |
| `src/usuario/` | Administração de usuários |
| `src/common/` | Auth, guards, erros e auditoria |
| `prisma/` | Schema, migrations e seed |
| `test/` | E2E contra MySQL real |

Regras de domínio: [docs/invariantes.md](../docs/invariantes.md),
[docs/matriz-de-acesso.md](../docs/matriz-de-acesso.md) e
[docs/glossario.md](../docs/glossario.md).
