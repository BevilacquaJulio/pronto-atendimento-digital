import { Module } from '@nestjs/common';
import { ProntuarioController } from './prontuario.controller';
import { ProntuarioRepository } from './prontuario.repository';
import { ProntuarioService } from './prontuario.service';

@Module({
  controllers: [ProntuarioController],
  providers: [ProntuarioRepository, ProntuarioService],
  exports: [ProntuarioService],
})
export class ProntuarioModule {}
