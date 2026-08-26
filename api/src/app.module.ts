import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AtendimentoModule } from './atendimento/atendimento.module';
import { AuthModule } from './common/auth/auth.module';
import { AuditoriaInterceptor } from './common/auditoria/auditoria.interceptor';
import { AuditoriaModule } from './common/auditoria/auditoria.module';
import { EscopoGuard } from './common/auth/guards/escopo.guard';
import { JwtAuthGuard } from './common/auth/guards/jwt-auth.guard';
import { PapelGuard } from './common/auth/guards/papel.guard';
import { FiltroDeExcecoes } from './common/erros/filtro-excecoes';
import { validarAmbiente } from './config/ambiente';
import { PrismaModule } from './common/prisma/prisma.module';
import { SaudeController } from './saude.controller';
import { ProntuarioModule } from './prontuario/prontuario.module';
import { PacienteModule } from './paciente/paciente.module';
import { UsuarioModule } from './usuario/usuario.module';
import { SalaModule } from './sala/sala.module';

@Module({
  imports: [
    // `validate` roda antes de qualquer provider ser instanciado: variável
    // faltando derruba o boot com uma mensagem que nomeia o problema, em vez
    // de estourar lá na frente como erro de injeção de dependência.
    ConfigModule.forRoot({ isGlobal: true, validate: validarAmbiente }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    AuditoriaModule,
    AtendimentoModule,
    ProntuarioModule,
    PacienteModule,
    UsuarioModule,
    SalaModule,
  ],
  controllers: [SaudeController],
  providers: [
    // A ordem aqui é a ordem de execução, e ela importa:
    //
    //   1. ThrottlerGuard — este cliente excedeu o limite? → 429
    //   2. JwtAuthGuard   — quem é você?                   → 401
    //   3. PapelGuard     — seu papel permite?             → 403
    //   4. EscopoGuard    — este recurso é seu?            → 403
    //
    // Invertida, o EscopoGuard consultaria o banco antes de saber se a
    // requisição sequer está autenticada — trabalho jogado fora e uma
    // consulta por requisição anônima, que é exatamente o que um ataque de
    // volume gostaria de provocar.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PapelGuard },
    { provide: APP_GUARD, useClass: EscopoGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditoriaInterceptor },
    { provide: APP_FILTER, useClass: FiltroDeExcecoes },
  ],
})
export class AppModule {}
