import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// Global porque praticamente todo módulo de domínio precisa do Prisma, e
// importar PrismaModule em cada um seria ruído sem contrapartida.
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
