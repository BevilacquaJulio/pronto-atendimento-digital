import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const apiDir = resolve(scriptDir, '..');
const repositoryDir = resolve(apiDir, '..');
const composeFile = join(repositoryDir, 'docker-compose.test.yml');
const composeProject = 'pad-e2e-local';
const testPort = process.env.PAD_TEST_PORT ?? '3307';

if (
  !/^\d+$/.test(testPort) ||
  Number(testPort) < 1 ||
  Number(testPort) > 65_535
) {
  throw new Error('PAD_TEST_PORT deve ser uma porta TCP válida');
}

const prismaCli = join(apiDir, 'node_modules', 'prisma', 'build', 'index.js');
const jestCli = join(apiDir, 'node_modules', 'jest', 'bin', 'jest.js');

if (!existsSync(prismaCli) || !existsSync(jestCli)) {
  throw new Error(
    'Dependências ausentes. Execute "npm ci" dentro da pasta api antes dos E2E.',
  );
}

const testEnvironment = {
  ...process.env,
  PAD_TEST_PORT: testPort,
  DATABASE_URL: `mysql://pad:pad@127.0.0.1:${testPort}/pad_test`,
  JWT_SECRET: 'segredo-e2e-local-com-pelo-menos-32-caracteres',
  JWT_EXPIRES_IN: '1h',
  SALA_TOKEN_TTL_SEG: '900',
  LIVEKIT_URL: 'ws://localhost:7880',
  LIVEKIT_PUBLIC_URL: 'ws://localhost:7880',
  LIVEKIT_API_KEY: 'devkey',
  LIVEKIT_API_SECRET: 'devsecretdevsecretdevsecret32chr',
  CORS_ORIGIN: 'http://localhost:5173',
  API_PORT: '3000',
  NODE_ENV: 'test',
  SEED_DEMO_PASSWORD: 'senha-publica-e2e-local-nao-usar-fora-de-testes',
};

const composeArguments = [
  'compose',
  '--project-name',
  composeProject,
  '--file',
  composeFile,
];

function execute(label, command, args, options = {}) {
  console.log(`\n[E2E] ${label}`);
  const result = spawnSync(command, args, {
    cwd: apiDir,
    env: testEnvironment,
    stdio: options.silent ? 'ignore' : 'inherit',
  });

  if (result.error) {
    throw new Error(`${label}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`${label} terminou com código ${result.status ?? 'nulo'}`);
  }
}

function removeTestEnvironment({ silent = false } = {}) {
  const result = spawnSync(
    'docker',
    [...composeArguments, 'down', '--volumes', '--remove-orphans'],
    {
      cwd: repositoryDir,
      env: testEnvironment,
      stdio: silent ? 'ignore' : 'inherit',
    },
  );
  return !result.error && result.status === 0;
}

function showTestEnvironmentLogs() {
  spawnSync(
    'docker',
    [...composeArguments, 'logs', '--no-color', 'db-test'],
    {
      cwd: repositoryDir,
      env: testEnvironment,
      stdio: 'inherit',
    },
  );
}

let dockerAvailable = false;
let failure = null;

try {
  execute('Verificando Docker', 'docker', [
    'version',
    '--format',
    '{{.Server.Version}}',
  ]);
  dockerAvailable = true;

  // Remove qualquer execução local interrompida antes de criar um banco novo.
  removeTestEnvironment({ silent: true });

  execute('Criando MySQL temporário pad_test', 'docker', [
    ...composeArguments,
    'up',
    '--detach',
    '--wait',
  ]);
  execute('Gerando Prisma Client', process.execPath, [prismaCli, 'generate']);
  execute('Aplicando migrations', process.execPath, [
    prismaCli,
    'migrate',
    'deploy',
  ]);
  execute('Aplicando seed', process.execPath, [prismaCli, 'db', 'seed']);
  execute('Executando testes E2E', process.execPath, [
    '--experimental-vm-modules',
    jestCli,
    '--config',
    './test/jest-e2e.json',
    '--runInBand',
  ]);
} catch (error) {
  failure = error;
} finally {
  if (dockerAvailable) {
    if (failure) {
      console.error('\n[E2E] Logs do MySQL temporário após a falha');
      showTestEnvironmentLogs();
    }
    console.log('\n[E2E] Removendo MySQL temporário');
    const removed = removeTestEnvironment();
    if (!removed && !failure) {
      failure = new Error('Não foi possível remover o ambiente E2E temporário');
    }
  }
}

if (failure) {
  console.error(`\n[E2E] Falha: ${failure.message}`);
  process.exitCode = 1;
} else {
  console.log(
    '\n[E2E] Concluído: testes aprovados e MySQL pad_test temporário removido.',
  );
}
