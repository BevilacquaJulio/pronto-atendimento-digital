// Os testes não dependem de um servidor LiveKit em execução. As credenciais
// abaixo servem apenas para assinar e verificar JWTs dentro do processo; a
// integração de rede é substituída por fake no teste específico da sala.
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL é obrigatória para executar os testes E2E');
}

const databaseName = new URL(databaseUrl).pathname.replace(/^\//, '');
if (!/^pad_test(?:_|$)/.test(databaseName)) {
  throw new Error(
    `E2E bloqueado no banco "${databaseName}". Use um banco exclusivo com nome pad_test ou pad_test_*.`,
  );
}

process.env.NODE_ENV = 'test';
process.env.LIVEKIT_URL ??= 'ws://localhost:7880';
process.env.LIVEKIT_API_KEY ??= 'devkey';
process.env.LIVEKIT_API_SECRET ??= 'devsecretdevsecretdevsecret32chr';
