import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../../../generated/prisma/client';

function montarAdapter(url: string): PrismaMariaDb {
  const parsed = new URL(url);
  const database = parsed.pathname.replace(/^\//, '').split('?')[0];

  return new PrismaMariaDb({
    host: parsed.hostname,
    port: Number(parsed.port || 3306),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database,
    charset: 'utf8mb4',
    // InnoDB usa REPEATABLE READ por padrão. O compare-and-swap do assumir
    // atendimento depende de o UPDATE reavaliar o WHERE contra a linha já
    // gravada — comportamento de READ COMMITTED. A variável vai em cada
    // conexão nova do pool; um SET SESSION só no boot afetaria uma conexão.
    sessionVariables: {
      transaction_isolation: 'READ-COMMITTED',
    },
  });
}

// No Prisma 7 o adapter de driver é obrigatório: `new PrismaClient()` sem
// adapter lança erro já no boot. Quem abre a conexão de verdade é o `mariadb`.
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const url = process.env.DATABASE_URL;
    if (!url) {
      // Falha aqui, no boot, e não no primeiro request em produção.
      throw new Error('DATABASE_URL não definida');
    }
    super({ adapter: montarAdapter(url) });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
