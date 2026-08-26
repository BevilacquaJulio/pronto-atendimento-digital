import { Module } from '@nestjs/common';
import { AtendimentoController } from './atendimento.controller';
import { AtendimentoRepository } from './atendimento.repository';
import { AtendimentoService } from './atendimento.service';
import { SalaModule } from '../sala/sala.module';

@Module({
  imports: [SalaModule],
  controllers: [AtendimentoController],
  providers: [AtendimentoService, AtendimentoRepository],
  exports: [AtendimentoService],
})
export class AtendimentoModule {}
