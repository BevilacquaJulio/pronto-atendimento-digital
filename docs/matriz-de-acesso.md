# Matriz de acesso

Cada rota da API, cruzada com cada papel, e o código HTTP esperado. Esta tabela é a especificação de autorização do sistema — o arquivo `api/test/autorizacao.e2e-spec.ts` a reproduz caso a caso.

A matriz foi escrita antes das rotas, de propósito: preencher célula a célula obriga a decidir explicitamente cada permissão, em vez de herdar o padrão implícito de que administrador pode tudo.

## Legenda

- `401` — não autenticado
- `403` — autenticado, sem permissão ou sem vínculo com o recurso
- `—` — rota não aplicável ao papel

| # | Rota | ENFERMEIRO | MEDICO | ADMIN | Anônimo |
|---|---|---|---|---|---|
| 1 | `POST /auth/login` | 200 | 200 | 200 | 200 |
| 2 | `GET /atendimentos` (fila) | 200 | 200 | **403** | 401 |
| 3 | `POST /atendimentos` | 201 | 201 | **403** | 401 |
| 4 | `POST /atendimentos/:id/iniciar` | 201 | 201 | **403** | 401 |
| 5 | `POST /atendimentos/:id/finalizar` — profissional vinculado | 200 | 200 | **403** | 401 |
| 6 | `POST /atendimentos/:id/finalizar` — não vinculado | **403** | **403** | **403** | 401 |
| 7 | `POST /atendimentos/:id/cancelar` (só de `AGUARDANDO`) | 200 | 200 | **403** | 401 |
| 8 | `POST /atendimentos/:id/encaminhar` | 201 | **403** | **403** | 401 |
| 9 | `POST /atendimentos/:id/triagem` | 201 | 201 | **403** | 401 |
| 10 | `GET /atendimentos/:id/prontuario` — vinculado | **403** | 200 | **403** | 401 |
| 11 | `GET /atendimentos/:id/prontuario` — não vinculado | **403** | **403** | **403** | 401 |
| 12 | `PATCH /prontuarios/:id` (não finalizado, autor) | **403** | 200 | **403** | 401 |
| 13 | `POST /prontuarios/:id/adendos` | **403** | 201 | **403** | 401 |
| 14 | `GET /pacientes` | 200 | 200 | **403** | 401 |
| 15 | `GET /pacientes/:id` (histórico clínico) | 200 | 200 | **403** | 401 |
| 16 | `POST /atendimentos/:id/sala/token` — vinculado | 201 | 201 | **403** | 401 |
| 17 | `POST /atendimentos/:id/sala/token` — não vinculado | **403** | **403** | **403** | 401 |
| 18 | `POST /atendimentos/:id/sala/renovar` — vinculado | 200 | 200 | **403** | 401 |
| 19 | `POST /sala/:token/entrar` — token válido | — | — | — | **200** |
| 20 | `POST /sala/:token/entrar` — token de outro atendimento | — | — | — | **403** |
| 21 | `GET /usuarios` | **403** | **403** | 200 | 401 |
| 22 | `POST /usuarios` | **403** | **403** | 201 | 401 |
| 23 | `PATCH /usuarios/:id` | **403** | **403** | 200 | 401 |
| 24 | `GET /auditoria` | **403** | **403** | **200** | 401 |
| 25 | `GET /atendimentos/:id` — vinculado | 200 | 200 | **403** | 401 |
| 26 | `GET /atendimentos/:id` — não vinculado | **403** | **403** | **403** | 401 |
| 27 | `GET /atendimentos/:id` — ainda `AGUARDANDO`, sem profissional | 200 | 200 | **403** | 401 |
| 28 | `POST /atendimentos/:id/sala/link-paciente` — vinculado | 201 | 201 | **403** | 401 |
| 29 | `POST /atendimentos/cadastrar-paciente` | 201 | **403** | **403** | 401 |
| 30 | `POST /sala/:atendimentoId/renovar` — token atual do paciente | — | — | — | **200** |

## Decisões que a matriz registra

**Enfermeiro não lê o prontuário completo (linha 10).** Os perfis são distintos: o enfermeiro registra triagem e encaminha; o prontuário completo, com anamnese e prescrição, pertence ao médico.

**Administrador não acessa nenhum dado clínico (linhas 2, 14 e 15).** O requisito original restringe o acesso do administrador ao prontuário. A restrição foi estendida à fila e à listagem de pacientes porque ambas exibem nome, contato e classificação de risco — informação clínica identificável. O papel administra identidade e permissão, não assistência.

**Administrador acessa o log de auditoria (linha 24).** É a contrapartida da decisão anterior: o administrador enxerga quem acessou qual paciente e quando, sem acessar o conteúdo. Metadado de acesso é instrumento de governança; conteúdo assistencial não é.

**Atendimento sem profissional é visível para os papéis clínicos (linha 27).** Enquanto está `AGUARDANDO`, ninguém está vinculado — exigir vínculo tornaria impossível abrir o primeiro atendimento da fila para então assumi-lo. A permissão dura só até alguém assumir: a partir daí valem as linhas 25 e 26. A regra é do `EscopoGuard`, e as rotas que não podem admiti-la (prontuário) declaram `permitirSemVinculo: false`.

**Cadastro e entrada na fila formam uma única operação (linha 29).** A enfermagem informa os dados da nova pessoa e o sistema cria um atendimento em `AGUARDANDO`, sem profissional vinculado e sem iniciar a triagem. Se o CPF já existir, a transação inteira falha e nenhum cadastro parcial permanece.

**O paciente renova a própria sessão, não o convite (linha 30).** O link opaco continua sendo de uso único. Depois da troca, o token LiveKit atual funciona como credencial de renovação: o backend confere somente seu hash, exige atendimento em andamento, revoga a credencial anterior de forma atômica e emite outra com TTL de no máximo 15 minutos. Token errado, expirado, revogado ou já renovado recebe a mesma resposta `403`.

**Identificador inexistente ou malformado responde `403`, nunca `404`.** Distinguir "não existe" de "não é seu" transformaria a rota num oráculo de existência: bastaria varrer identificadores e separar as respostas para descobrir quantos atendimentos o sistema tem.

**Permissão não se resume ao papel (linhas 6, 11 e 17).** Um médico autenticado que solicita o prontuário de um atendimento ao qual não está vinculado recebe `403`. Sem essa verificação de vínculo, trocar o identificador na URL exporia dado de outro paciente.

## Reprodução em teste

```ts
const MATRIZ: [Papel, Metodo, string, number][] = [
  ['ANONIMO',    'GET',  '/atendimentos',                     401],
  ['ADMIN',      'GET',  '/atendimentos',                     403],
  ['ADMIN',      'GET',  '/atendimentos/:vinculado/prontuario', 403],
  ['ADMIN',      'GET',  '/auditoria',                        200],
  ['ENFERMEIRO', 'GET',  '/atendimentos/:vinculado/prontuario', 403],
  ['MEDICO',     'GET',  '/atendimentos/:vinculado/prontuario', 200],
  ['MEDICO',     'GET',  '/atendimentos/:alheio/prontuario',  403],
  ['MEDICO',     'POST', '/atendimentos/:id/encaminhar',      403],
  // ... uma linha por célula da tabela acima
];

it.each(MATRIZ)('%s %s %s → %i', async (papel, metodo, rota, esperado) => {
  const res = await request(app.getHttpServer())
    [metodo.toLowerCase()](resolver(rota))
    .set(headersDe(papel));
  expect(res.status).toBe(esperado);
});
```
